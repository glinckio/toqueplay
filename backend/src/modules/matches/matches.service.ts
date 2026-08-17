import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { MatchesGateway } from './matches.gateway';
import { RankingService } from '../ranking/ranking.service';
import { BracketsService } from '../brackets/brackets.service';
import { NotificationService } from '../../common/services/notification.service';
import { PointDto } from './dto/point.dto';
import { SetFinishDto } from './dto/set-finish.dto';
import { WalkoverDto } from './dto/walkover.dto';
import { TimeoutDto } from './dto/timeout.dto';
import { SubstitutionDto } from './dto/substitution.dto';
import { SetLineupDto } from './dto/set-lineup.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { MatchStatus, MatchEventType, TournamentModality, RegistrationStatus } from '@prisma/client';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private prisma: PrismaService,
    private matchesGateway: MatchesGateway,
    private rankingService: RankingService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => BracketsService))
    private bracketsService: BracketsService,
  ) {}

  private emitMatchEvent(match: any, event: string, data: any) {
    this.logger.verbose(`ws emit event=${event} match=${match.id}`);
    // Always emit to match room (works for both tournament and friendly)
    this.matchesGateway.emitToMatch(match.id, event, data);
    if (match.friendlyId) {
      this.matchesGateway.emitToFriendly(match.friendlyId, event, data);
    } else if (match.bracket?.tournamentId) {
      this.matchesGateway.emitToTournament(match.bracket.tournamentId, event, data);
    }
  }

  async startMatch(matchId: string, userId: string) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.SCHEDULED) {
      throw AppError.matchNotScheduled();
    }

    if (!match.teamAId || !match.teamBId) {
      throw AppError.missingOpponent();
    }

    const now = new Date();

    // For friendly matches: can only start on the scheduled day, at or after the scheduled time
    if (match.friendlyId && match.friendly) {
      const friendlyDate = new Date(match.friendly.date);
      const todayStart = new Date(friendlyDate.getFullYear(), friendlyDate.getMonth(), friendlyDate.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);

      if (now < todayStart || now > todayEnd) {
        throw AppError.cannotStartMatchOutsideDay();
      }

      // If startTime is set, match can only start at or after that time
      if (match.friendly.startTime) {
        const scheduledTime = new Date(match.friendly.startTime);
        const earliestStart = new Date(todayStart);
        earliestStart.setHours(scheduledTime.getHours(), scheduledTime.getMinutes(), 0, 0);
        if (now < earliestStart) {
          throw AppError.cannotStartMatchBeforeTime();
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.matchSet.create({
        data: { matchId, setNumber: 1 },
      });

      const updateData: any = {
        status: MatchStatus.IN_PROGRESS,
        startedAt: now,
      };

      // Backfill bestOfSets and tiebreakScore from category if not set
      if (!match.bestOfSets && match.bracketId) {
        const category = await tx.tournamentCategory.findFirst({
          where: { brackets: { some: { id: match.bracketId } } },
        });
        if (category) {
          updateData.bestOfSets = category.bestOfSets;
          if (!match.tiebreakScore && category.tiebreakScore) {
            updateData.tiebreakScore = category.tiebreakScore;
          }
        }
      }

      const m = await tx.match.update({
        where: { id: matchId },
        data: updateData,
        include: {
          teamA: { select: { id: true, name: true, avatarUrl: true } },
          teamB: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      await tx.matchEvent.create({
        data: {
          matchId,
          type: MatchEventType.MATCH_START,
          setNumber: 1,
          createdBy: userId,
        },
      });

      return m;
    });

    this.emitMatchEvent(match, 'match:start', {
      matchId,
      teamAId: updated.teamAId,
      teamBId: updated.teamBId,
    });

    return updated;
  }

  async registerPoint(matchId: string, userId: string, dto: PointDto) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw AppError.matchNotInProgress();
    }

    const isTeamA = dto.team === 'A';

    const currentSet = await this.prisma.matchSet.findFirst({
      where: { matchId },
      orderBy: { setNumber: 'desc' },
    });

    if (!currentSet) {
      throw AppError.setNotFound();
    }

    await this.assertLineupComplete(match, matchId, currentSet.setNumber);

    // Only update set score — match score tracks sets won
    await this.prisma.$transaction(async (tx) => {
      await tx.matchSet.update({
        where: { id: currentSet.id },
        data: isTeamA ? { scoreA: { increment: 1 } } : { scoreB: { increment: 1 } },
      });

      await tx.pointEvent.create({
        data: {
          matchId,
          setNumber: currentSet.setNumber,
          scoredBy: dto.team,
        },
      });
    });

    const updatedMatch = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
        sets: { orderBy: { setNumber: 'asc' as const } },
      },
    });

    // Compute new set scores
    const modality = this.getMatchModality(match);
    const newSetScoreA = isTeamA ? currentSet.scoreA + 1 : currentSet.scoreA;
    const newSetScoreB = isTeamA ? currentSet.scoreB : currentSet.scoreB + 1;

    // Side switch check: beach only, first team to reach 11 in current set, ONCE per set
    const isBeach = modality === TournamentModality.BEACH;
    const prevSetScoreA = currentSet.scoreA;
    const prevSetScoreB = currentSet.scoreB;
    const firstToReach11 = (prevSetScoreA < 11 && newSetScoreA >= 11) || (prevSetScoreB < 11 && newSetScoreB >= 11);
    const alreadySwitched = isBeach && firstToReach11
      ? !!(await this.prisma.matchEvent.findFirst({
          where: { matchId, type: MatchEventType.SIDE_SWITCH, setNumber: currentSet.setNumber },
        }))
      : false;
    const sideSwitch = isBeach && firstToReach11 && !alreadySwitched;

    this.emitMatchEvent(match, 'match:point', {
      matchId,
      team: dto.team,
      scoreA: updatedMatch!.scoreTeamA,
      scoreB: updatedMatch!.scoreTeamB,
      setNumber: currentSet.setNumber,
      sideSwitch,
      sets: updatedMatch!.sets,
    });

    if (sideSwitch) {
      await this.prisma.matchEvent.create({
        data: {
          matchId,
          type: MatchEventType.SIDE_SWITCH,
          setNumber: currentSet.setNumber,
          team: dto.team,
          scoreA: newSetScoreA,
          scoreB: newSetScoreB,
          createdBy: userId,
        },
      });
    }

    const isFriendly = !!match.friendlyId;
    const setReachedWinningScore = this.isWinningScore(newSetScoreA, newSetScoreB, modality, currentSet.setNumber, match.bestOfSets, match.tiebreakScore);

    // For friendly matches: just flag set finished (manual match finish)
    const setFinished = isFriendly && setReachedWinningScore;

    // For tournament matches with bestOfSets: auto-finish set, then check sets won
    if (!isFriendly && setReachedWinningScore && match.bestOfSets) {
      // Finish the current set
      await this.finishSet(matchId, userId, { setNumber: currentSet.setNumber });

      // Count sets won and update match score
      const { a: setsWonA, b: setsWonB } = await this.countSetsWon(matchId);
      await this.prisma.match.update({
        where: { id: matchId },
        data: { scoreTeamA: setsWonA, scoreTeamB: setsWonB },
      });

      // Check if match is decided
      const setsNeeded = this.getSetsNeededToWin(match.bestOfSets);
      if (setsWonA >= setsNeeded || setsWonB >= setsNeeded) {
        await this.finishMatch(matchId, userId);
        return this.prisma.match.findUnique({
          where: { id: matchId },
          include: {
            teamA: { select: { id: true, name: true, avatarUrl: true } },
            teamB: { select: { id: true, name: true, avatarUrl: true } },
            sets: { orderBy: { setNumber: 'asc' as const } },
            winner: { select: { id: true, name: true } },
          },
        });
      }

      // Re-fetch after set finish
      const refreshed = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: { select: { id: true, name: true, avatarUrl: true } },
          teamB: { select: { id: true, name: true, avatarUrl: true } },
          sets: { orderBy: { setNumber: 'asc' as const } },
        },
      });
      return { ...refreshed, setFinished: true, currentSetNumber: currentSet.setNumber + 1 };
    }

    // Legacy: no bestOfSets — auto-finish match on total score threshold
    if (!isFriendly && !match.bestOfSets && this.isWinningScore(updatedMatch!.scoreTeamA, updatedMatch!.scoreTeamB, modality)) {
      await this.finishMatch(matchId, userId);
      return this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: { select: { id: true, name: true, avatarUrl: true } },
          teamB: { select: { id: true, name: true, avatarUrl: true } },
          sets: { orderBy: { setNumber: 'asc' as const } },
          winner: { select: { id: true, name: true } },
        },
      });
    }

    return { ...updatedMatch, setFinished, currentSetNumber: currentSet?.setNumber };
  }

  async removePoint(matchId: string, userId: string, dto: PointDto) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw AppError.matchNotInProgress();
    }

    const isTeamA = dto.team === 'A';

    const currentSet = await this.prisma.matchSet.findFirst({
      where: { matchId },
      orderBy: { setNumber: 'desc' },
    });

    if (!currentSet) {
      throw AppError.setNotFound();
    }

    // Don't allow negative scores
    if (isTeamA && currentSet.scoreA <= 0) return this.prisma.match.findUnique({ where: { id: matchId } });
    if (!isTeamA && currentSet.scoreB <= 0) return this.prisma.match.findUnique({ where: { id: matchId } });

    await this.prisma.$transaction(async (tx) => {
      // Only decrement set score
      await tx.matchSet.update({
        where: { id: currentSet.id },
        data: isTeamA ? { scoreA: { decrement: 1 } } : { scoreB: { decrement: 1 } },
      });

      // Remove last point event
      const lastPoint = await tx.pointEvent.findFirst({
        where: { matchId, setNumber: currentSet.setNumber, scoredBy: dto.team },
        orderBy: { timestamp: 'desc' },
      });
      if (lastPoint) {
        await tx.pointEvent.delete({ where: { id: lastPoint.id } });
      }

      // Recalculate sets won for match score
      if (match.bestOfSets) {
        const allSets = await tx.matchSet.findMany({ where: { matchId } });
        let setsWonA = 0, setsWonB = 0;
        for (const s of allSets) {
          if (s.scoreA > s.scoreB) setsWonA++;
          else if (s.scoreB > s.scoreA) setsWonB++;
        }
        await tx.match.update({
          where: { id: matchId },
          data: { scoreTeamA: setsWonA, scoreTeamB: setsWonB },
        });
      } else {
        // Legacy: decrement match total score
        const updateData: any = {};
        if (isTeamA) updateData.scoreTeamA = { decrement: 1 };
        else updateData.scoreTeamB = { decrement: 1 };
        await tx.match.update({ where: { id: matchId }, data: updateData });
      }
    });

    const updatedMatch = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
        sets: { orderBy: { setNumber: 'asc' as const } },
      },
    });

    this.emitMatchEvent(match, 'match:point', {
      matchId,
      team: dto.team,
      scoreA: updatedMatch!.scoreTeamA,
      scoreB: updatedMatch!.scoreTeamB,
      setNumber: currentSet.setNumber,
      sets: updatedMatch!.sets,
    });

    return updatedMatch;
  }

  async finishSet(matchId: string, userId: string, dto: SetFinishDto) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw AppError.matchNotInProgress();
    }

    const setToFinish = await this.prisma.matchSet.findUnique({
      where: { matchId_setNumber: { matchId, setNumber: dto.setNumber } },
    });

    if (!setToFinish) {
      throw AppError.setNotFound();
    }

    // Validate set has a winner (no ties)
    if (setToFinish.scoreA === setToFinish.scoreB) {
      throw AppError.scoreNotWinning();
    }

    await this.prisma.matchEvent.create({
      data: {
        matchId,
        type: MatchEventType.SET_FINISH,
        setNumber: dto.setNumber,
        scoreA: setToFinish.scoreA,
        scoreB: setToFinish.scoreB,
        createdBy: userId,
      },
    });

    // Count sets won and update match score
    const { a: setsWonA, b: setsWonB } = await this.countSetsWon(matchId);
    await this.prisma.match.update({
      where: { id: matchId },
      data: { scoreTeamA: setsWonA, scoreTeamB: setsWonB },
    });

    // Only create next set if match is not yet decided
    const bestOfSets = match.bestOfSets ?? 0;
    if (bestOfSets > 0) {
      const setsNeeded = this.getSetsNeededToWin(bestOfSets);
      if (setsWonA < setsNeeded && setsWonB < setsNeeded) {
        const nextSetNumber = dto.setNumber + 1;
        const existingNext = await this.prisma.matchSet.findUnique({
          where: { matchId_setNumber: { matchId, setNumber: nextSetNumber } },
        });
        if (!existingNext) {
          await this.prisma.matchSet.create({
            data: { matchId, setNumber: nextSetNumber },
          });
        }
      }
    } else {
      // Legacy: always create next set
      const nextSetNumber = dto.setNumber + 1;
      const existingNext = await this.prisma.matchSet.findUnique({
        where: { matchId_setNumber: { matchId, setNumber: nextSetNumber } },
      });
      if (!existingNext) {
        await this.prisma.matchSet.create({
          data: { matchId, setNumber: nextSetNumber },
        });
      }
    }

    const updatedSets = await this.prisma.matchSet.findMany({
      where: { matchId },
      orderBy: { setNumber: 'asc' as const },
    });

    this.emitMatchEvent(match, 'match:set-finish', {
      matchId,
      setNumber: dto.setNumber,
      scoreA: setToFinish.scoreA,
      scoreB: setToFinish.scoreB,
      sets: updatedSets,
    });

    // Notify both teams' athletes about set result
    const teamIds = [match.teamAId, match.teamBId].filter(Boolean) as string[];
    const teamUserIds = (await Promise.all(teamIds.map((tid: string) => this.notificationService.getTeamMemberUserIds(tid)))).flat();
    const uniqueUserIds = [...new Set(teamUserIds.filter((id: string) => id !== userId))];
    if (uniqueUserIds.length > 0) {
      await this.notificationService.sendToUsers(uniqueUserIds, {
        title: 'Set Encerrado',
        body: `Set ${dto.setNumber} encerrado! Placar: ${setToFinish.scoreA} x ${setToFinish.scoreB}`,
        type: 'MATCH_SET',
        referenceId: matchId,
      });
    }

    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sets: { orderBy: { setNumber: 'asc' as const } },
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async finishMatch(matchId: string, userId: string) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw AppError.matchNotInProgress();
    }

    // Validate winning criteria (skip for friendlies — manual finish)
    const isFriendly = !!match.friendlyId;
    if (!isFriendly) {
      if (match.bestOfSets) {
        // New: validate by sets won
        const setsNeeded = this.getSetsNeededToWin(match.bestOfSets);
        if (match.scoreTeamA < setsNeeded && match.scoreTeamB < setsNeeded) {
          throw AppError.scoreNotWinning();
        }
      } else {
        // Legacy: validate by total score
        const modality = this.getMatchModality(match);
        if (!this.isWinningScore(match.scoreTeamA, match.scoreTeamB, modality)) {
          throw AppError.scoreNotWinning();
        }
      }
    }

    let winnerId: string | null = null;
    if (match.scoreTeamA > match.scoreTeamB) {
      winnerId = match.teamAId;
    } else if (match.scoreTeamB > match.scoreTeamA) {
      winnerId = match.teamBId;
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const finished = await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.FINISHED,
          finishedAt: now,
          winnerId,
        },
        include: {
          teamA: { select: { id: true, name: true, avatarUrl: true } },
          teamB: { select: { id: true, name: true, avatarUrl: true } },
          winner: { select: { id: true, name: true } },
        },
      });

      // Advance winner in tournament bracket (only for bracket matches)
      if (winnerId && match.nextMatchId && match.bracketId) {
        await this.advanceWinner(tx, match.nextMatchId, winnerId);
      }

      // Sync friendly status if this is a friendly match
      if (finished.friendlyId) {
        await tx.friendly.update({
          where: { id: finished.friendlyId },
          data: {
            status: 'COMPLETED',
            scoreTeamA: finished.scoreTeamA,
            scoreTeamB: finished.scoreTeamB,
          },
        });
      }

      return finished;
    });

    await this.prisma.matchEvent.create({
      data: {
        matchId,
        type: MatchEventType.MATCH_FINISH,
        scoreA: match.scoreTeamA,
        scoreB: match.scoreTeamB,
        team: winnerId === match.teamAId ? 'A' : winnerId === match.teamBId ? 'B' : null,
        createdBy: userId,
      },
    });

    this.emitMatchEvent(match, 'match:finish', {
      matchId,
      winnerId,
      scoreA: match.scoreTeamA,
      scoreB: match.scoreTeamB,
    });

    await this.rankingService.updateStatsAfterMatch(matchId);

    // Auto-advance group teams if applicable
    await this.bracketsService.checkAndAdvanceGroupTeams(matchId).catch(() => {});

    // Auto-advance round-robin teams to playoffs if applicable
    await this.bracketsService.checkAndAdvanceRoundRobinTeams(matchId).catch(() => {});

    // Notify both teams' athletes about match result
    const matchTeamIds = [updated.teamA?.id, updated.teamB?.id].filter(Boolean) as string[];
    const matchTeamUserIds = (await Promise.all(matchTeamIds.map((tid: string) => this.notificationService.getTeamMemberUserIds(tid)))).flat();
    const matchUniqueUserIds = [...new Set(matchTeamUserIds.filter((id: string) => id !== userId))];
    if (matchUniqueUserIds.length > 0) {
      const winnerName = updated.winner?.name;
      await this.notificationService.sendToUsers(matchUniqueUserIds, {
        title: 'Partida Encerrada',
        body: winnerName
          ? `Partida finalizada! Vencedor: ${winnerName} (${match.scoreTeamA} x ${match.scoreTeamB})`
          : `Partida finalizada! Placar: ${match.scoreTeamA} x ${match.scoreTeamB}`,
        type: 'MATCH_FINISH',
        referenceId: matchId,
      });
    }

    return updated;
  }

  async declareWalkover(matchId: string, userId: string, dto: WalkoverDto) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.SCHEDULED) {
      throw AppError.matchNotScheduled();
    }

    const winnerId = dto.winnerTeam === 'A' ? match.teamAId : match.teamBId;
    if (!winnerId) {
      throw AppError.walkoverTeamRequired();
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const finished = await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.WALKOVER,
          finishedAt: now,
          winnerId,
        },
        include: {
          teamA: { select: { id: true, name: true, avatarUrl: true } },
          teamB: { select: { id: true, name: true, avatarUrl: true } },
          winner: { select: { id: true, name: true } },
        },
      });

      // Advance winner in tournament bracket (only for bracket matches)
      if (match.nextMatchId && match.bracketId) {
        await this.advanceWinner(tx, match.nextMatchId, winnerId);
      }

      return finished;
    });

    await this.prisma.matchEvent.create({
      data: {
        matchId,
        type: MatchEventType.WALKOVER,
        scoreA: match.scoreTeamA,
        scoreB: match.scoreTeamB,
        team: dto.winnerTeam,
        createdBy: userId,
      },
    });

    this.emitMatchEvent(match, 'match:finish', {
      matchId,
      winnerId,
      scoreA: match.scoreTeamA,
      scoreTeamB: match.scoreTeamB,
      walkover: true,
    });

    await this.rankingService.updateStatsAfterMatch(matchId);

    // Auto-advance group teams if applicable
    await this.bracketsService.checkAndAdvanceGroupTeams(matchId).catch(() => {});

    // Auto-advance round-robin teams to playoffs if applicable
    await this.bracketsService.checkAndAdvanceRoundRobinTeams(matchId).catch(() => {});

    return updated;
  }

  async registerTimeout(matchId: string, userId: string, dto: TimeoutDto) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw AppError.matchNotInProgress();
    }

    const currentSet = await this.prisma.matchSet.findFirst({
      where: { matchId },
      orderBy: { setNumber: 'desc' },
    });

    const teamId = dto.team === 'A' ? match.teamAId : dto.team === 'B' ? match.teamBId : null;

    const event = await this.prisma.matchEvent.create({
      data: {
        matchId,
        type: MatchEventType.TIMEOUT,
        setNumber: currentSet?.setNumber ?? null,
        team: dto.team ?? null,
        teamId,
        createdBy: userId,
      },
    });

    this.emitMatchEvent(match, 'match:update', {
      matchId,
      event: {
        id: event.id,
        type: 'TIMEOUT',
        team: dto.team ?? null,
        teamId,
        setNumber: currentSet?.setNumber ?? null,
        scoreA: match.scoreTeamA,
        scoreB: match.scoreTeamB,
        createdAt: event.createdAt,
      },
    });

    return event;
  }

  async registerSubstitution(matchId: string, userId: string, dto: SubstitutionDto) {
    const match = await this.findMatchWithReferee(matchId, userId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw AppError.matchNotInProgress();
    }

    // Validate team is part of this match
    const isTeamA = match.teamAId === dto.teamId;
    const isTeamB = match.teamBId === dto.teamId;
    if (!isTeamA && !isTeamB) {
      throw AppError.playerNotInTeam();
    }

    const currentSet = await this.prisma.matchSet.findFirst({
      where: { matchId },
      orderBy: { setNumber: 'desc' },
    });

    const teamSide = isTeamA ? 'A' : 'B';

    // Beach doubles: substitution is purely informational, no specific players
    // are picked. Only validate/store player IDs when they're actually sent.
    if (dto.playerOutId || dto.playerInId) {
      if (dto.playerOutId === dto.playerInId) {
        throw AppError.samePlayerSubstitution();
      }

      const members = await this.prisma.teamMember.findMany({
        where: {
          teamId: dto.teamId,
          userId: { in: [dto.playerOutId, dto.playerInId].filter(Boolean) as string[] },
        },
        select: { id: true, userId: true },
      });

      const memberByUserId = new Map(members.map((m) => [m.userId, m.id]));
      const outMemberId = memberByUserId.get(dto.playerOutId!);
      const inMemberId = memberByUserId.get(dto.playerInId!);
      if (!outMemberId || !inMemberId) {
        throw AppError.playerNotInTeam();
      }

      // Keep the lineup in sync: whoever comes in takes the exact court
      // position the outgoing player held, so the next substitution's
      // "quem sai/entra" reflects who's actually on court now.
      if (currentSet) {
        await this.prisma.matchLineupSlot.updateMany({
          where: { matchId, setNumber: currentSet.setNumber, team: teamSide, teamMemberId: outMemberId },
          data: { teamMemberId: inMemberId },
        });
      }
    }

    const event = await this.prisma.matchEvent.create({
      data: {
        matchId,
        type: MatchEventType.SUBSTITUTION,
        setNumber: currentSet?.setNumber ?? null,
        team: teamSide,
        teamId: dto.teamId,
        playerOutId: dto.playerOutId,
        playerInId: dto.playerInId,
        createdBy: userId,
      },
    });

    this.emitMatchEvent(match, 'match:update', {
      matchId,
      event: {
        id: event.id,
        type: 'SUBSTITUTION',
        team: teamSide,
        teamId: dto.teamId,
        playerOutId: dto.playerOutId,
        playerInId: dto.playerInId,
        setNumber: currentSet?.setNumber ?? null,
        scoreA: match.scoreTeamA,
        scoreB: match.scoreTeamB,
        createdAt: event.createdAt,
      },
    });

    return event;
  }

  // Roster the referee can pick from (substitution and lineup): for tournament
  // matches, only the team's players actually registered for this category (a
  // squad can be bigger than what was registered) — for friendlies, the athletes
  // actually escalated for that friendly, falling back to the whole roster if
  // no selection was ever made.
  private async getTeamRoster(match: any, teamId: string) {
    if (match.bracketId) {
      const bracket = await this.prisma.bracket.findUnique({
        where: { id: match.bracketId },
        select: { tournamentId: true, categoryId: true },
      });
      if (!bracket) return [];

      const registration = await this.prisma.registration.findFirst({
        where: {
          tournamentId: bracket.tournamentId,
          teamId,
          categoryId: bracket.categoryId,
          status: { notIn: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED] },
        },
        include: {
          members: {
            include: {
              teamMember: {
                include: { user: { select: { id: true, name: true, avatarUrl: true } } },
              },
            },
          },
        },
      });
      if (!registration) return [];

      return registration.members
        .map((m) => m.teamMember)
        .filter((tm) => !tm.isGuest && tm.userId)
        .map((tm) => ({ id: tm.id, userId: tm.userId, name: tm.user?.name, avatarUrl: tm.user?.avatarUrl, jerseyNumber: tm.jerseyNumber }));
    }

    if (match.friendlyId && match.friendly) {
      const side = teamId === match.friendly.requesterTeamId ? 'REQUESTER' : 'CHALLENGED';
      const athletes = await this.prisma.friendlyAthlete.findMany({
        where: { friendlyId: match.friendlyId, side },
        include: {
          teamMember: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      });
      if (athletes.length > 0) {
        return athletes
          .map((a) => a.teamMember)
          .filter((tm) => !tm.isGuest && tm.userId)
          .map((tm) => ({ id: tm.id, userId: tm.userId, name: tm.user?.name, avatarUrl: tm.user?.avatarUrl, jerseyNumber: tm.jerseyNumber }));
      }
    }

    // No selection was made for this friendly (or it's not a friendly at all) —
    // fall back to the whole team roster.
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, isGuest: false },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return members
      .filter((tm) => tm.userId)
      .map((tm) => ({ id: tm.id, userId: tm.userId, name: tm.user?.name, avatarUrl: tm.user?.avatarUrl, jerseyNumber: tm.jerseyNumber }));
  }

  async getSubstitutionRoster(matchId: string, userId: string, team: 'A' | 'B') {
    const match = await this.findMatchWithReferee(matchId, userId);
    const teamId = team === 'A' ? match.teamAId : match.teamBId;
    if (!teamId) return [];
    return this.getTeamRoster(match, teamId);
  }

  // Lineup for a given set: which roster member is in each of the 6 court
  // positions. Skippable by design — an empty result just means "not set".
  async getLineup(matchId: string, userId: string, setNumber: number) {
    await this.findMatchWithReferee(matchId, userId);
    const slots = await this.prisma.matchLineupSlot.findMany({
      where: { matchId, setNumber },
      include: {
        teamMember: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { position: 'asc' },
    });

    const toEntry = (s: (typeof slots)[number]) => ({
      position: s.position,
      teamMemberId: s.teamMemberId,
      userId: s.teamMember.userId,
      name: s.teamMember.user?.name,
      jerseyNumber: s.teamMember.jerseyNumber,
    });

    return {
      A: slots.filter((s) => s.team === 'A').map(toEntry),
      B: slots.filter((s) => s.team === 'B').map(toEntry),
    };
  }

  async setLineup(matchId: string, userId: string, dto: SetLineupDto) {
    const match = await this.findMatchWithReferee(matchId, userId);
    const teamId = dto.team === 'A' ? match.teamAId : match.teamBId;
    if (!teamId) throw AppError.playerNotInTeam();

    const positions = new Set(dto.positions.map((p) => p.position));
    if (positions.size !== dto.positions.length) {
      throw AppError.duplicateLineupPosition();
    }

    const roster = await this.getTeamRoster(match, teamId);
    const rosterIds = new Set(roster.map((r) => r.id));
    for (const p of dto.positions) {
      if (!rosterIds.has(p.teamMemberId)) {
        throw AppError.playerNotInTeam();
      }
    }

    await this.prisma.$transaction([
      this.prisma.matchLineupSlot.deleteMany({
        where: { matchId, setNumber: dto.setNumber, team: dto.team },
      }),
      this.prisma.matchLineupSlot.createMany({
        data: dto.positions.map((p) => ({
          matchId,
          setNumber: dto.setNumber,
          team: dto.team,
          position: p.position,
          teamMemberId: p.teamMemberId,
        })),
      }),
    ]);

    return this.getLineup(matchId, userId, dto.setNumber);
  }

  async findRefereeMine(userId: string) {
    return this.prisma.match.findMany({
      where: { refereeId: userId },
      include: {
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
        bracket: { select: { tournamentId: true, tournament: { select: { name: true } } } },
        friendly: { select: { id: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(matchId: string, _userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sets: { orderBy: { setNumber: 'asc' as const } },
        pointEvents: { orderBy: { timestamp: 'asc' as const } },
        matchEvents: { orderBy: { createdAt: 'asc' as const } },
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
        winner: { select: { id: true, name: true } },
        bracket: { select: { tournamentId: true, categoryId: true, category: { select: { modality: true } } } },
        friendly: { select: { id: true, modality: true, categoryFormat: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  // ── Referee Code ──────────────────────────────────────────────────────────

  async generateRefereeCode(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { bracket: { include: { tournament: true } } },
    });
    if (!match) throw AppError.matchNotFound();
    if (!match.bracket?.tournament) throw AppError.matchNotFound();

    // Only tournament owner can generate
    if (match.bracket.tournament.ownerId !== userId) {
      throw AppError.tournamentNotFound();
    }

    // If code exists and not expired, return it
    if (match.refereeCode && match.refereeCodeExpiresAt && match.refereeCodeExpiresAt > new Date()) {
      return { code: match.refereeCode, matchId };
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.match.update({
      where: { id: matchId },
      data: { refereeCode: code, refereeCodeExpiresAt: expiresAt },
    });

    return { code, matchId };
  }

  async enterRefereeCode(userId: string, code: string) {
    const match = await this.prisma.match.findFirst({
      where: {
        refereeCode: code,
        refereeCodeExpiresAt: { gt: new Date() },
      },
      include: {
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
        winner: { select: { id: true, name: true, avatarUrl: true } },
        sets: { orderBy: { setNumber: 'asc' } },
        bracket: {
          select: {
            id: true,
            tournamentId: true,
            tournament: { select: { id: true, name: true, ownerId: true } },
          },
        },
      },
    });

    if (!match) {
      throw AppError.invalidRefereeCode();
    }

    await this.prisma.match.update({
      where: { id: match.id },
      data: { refereeId: userId },
    });

    return { ...match, refereeId: userId };
  }

  async getTimeline(matchId: string) {
    const [pointEvents, matchEvents] = await Promise.all([
      this.prisma.pointEvent.findMany({
        where: { matchId },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.matchEvent.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Merge into unified timeline
    const timeline: any[] = [];

    // Running score per set, so each point shows the score right after it happened.
    const runningScore = new Map<number, { scoreA: number; scoreB: number }>();
    for (const pe of pointEvents) {
      const current = runningScore.get(pe.setNumber) ?? { scoreA: 0, scoreB: 0 };
      if (pe.scoredBy === 'A') current.scoreA += 1;
      else current.scoreB += 1;
      runningScore.set(pe.setNumber, current);

      timeline.push({
        type: 'POINT',
        team: pe.scoredBy,
        setNumber: pe.setNumber,
        scoreA: current.scoreA,
        scoreB: current.scoreB,
        timestamp: pe.timestamp,
      });
    }

    for (const me of matchEvents) {
      timeline.push({
        type: me.type,
        team: me.team ?? null,
        setNumber: me.setNumber ?? null,
        scoreA: me.scoreA ?? null,
        scoreB: me.scoreB ?? null,
        timestamp: me.createdAt,
      });
    }

    // Sort by timestamp descending (newest first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return timeline;
  }

  private readonly nearbyMatchInclude = {
    teamA: { select: { id: true, name: true, avatarUrl: true } },
    teamB: { select: { id: true, name: true, avatarUrl: true } },
    sets: { orderBy: { setNumber: 'asc' as const } },
    bracket: {
      select: {
        tournamentId: true,
        tournament: {
          select: {
            id: true,
            name: true,
            stages: {
              where: { latitude: { not: null }, longitude: { not: null } },
              select: { id: true, latitude: true, longitude: true, city: true, address: true },
            },
          },
        },
      },
    },
  };

  private mapNearbyMatch(match: any, userLat?: number, userLng?: number) {
    const tournamentStages = match.bracket?.tournament?.stages ?? [];
    let distanceKm: number | null = null;
    let nearestStage = tournamentStages[0] ?? null;

    if (userLat !== undefined && userLng !== undefined) {
      let minDistance = Infinity;
      for (const stage of tournamentStages) {
        if (stage.latitude && stage.longitude) {
          const dist = this.haversineKm(userLat, userLng, stage.latitude, stage.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearestStage = stage;
          }
        }
      }
      if (minDistance !== Infinity) distanceKm = Math.round(minDistance * 10) / 10;
    }

    return {
      id: match.id,
      scoreTeamA: match.scoreTeamA,
      scoreTeamB: match.scoreTeamB,
      status: match.status,
      startedAt: match.startedAt,
      teamA: match.teamA,
      teamB: match.teamB,
      sets: match.sets,
      tournamentId: match.bracket?.tournamentId ?? null,
      tournament: match.bracket?.tournament
        ? { id: match.bracket.tournament.id, name: match.bracket.tournament.name }
        : null,
      nearestStage: nearestStage ? { city: nearestStage.city, address: nearestStage.address } : null,
      distanceKm,
    };
  }

  async findNearby(userId: string, query: NearbyQueryDto) {
    let { latitude, longitude } = query;
    const { radius = 10 } = query;

    // Client-supplied coords may not have resolved yet (fresh GPS fix can be
    // slow/flaky, especially on Android). Fall back to the user's last saved
    // location — the same source "nearby tournaments" on Home already relies on —
    // instead of silently skipping the radius search.
    if (latitude === undefined || longitude === undefined) {
      const savedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { latitude: true, longitude: true },
      });
      if (savedUser?.latitude != null && savedUser?.longitude != null) {
        latitude = savedUser.latitude;
        longitude = savedUser.longitude;
      }
    }

    const merged = new Map<string, ReturnType<MatchesService['mapNearbyMatch']>>();

    // Matches from tournaments the user is currently playing in, regardless of distance.
    const participantMatches = await this.prisma.match.findMany({
      where: {
        status: MatchStatus.IN_PROGRESS,
        bracket: { isNot: null },
        OR: [
          { teamA: { members: { some: { userId } } } },
          { teamB: { members: { some: { userId } } } },
        ],
      },
      include: this.nearbyMatchInclude,
    });
    for (const match of participantMatches) {
      merged.set(match.id, this.mapNearbyMatch(match, latitude, longitude));
    }

    // Matches whose tournament stage is within the given radius of the user.
    if (latitude !== undefined && longitude !== undefined) {
      const kmPerDegreeLat = 111;
      const kmPerDegreeLng = 111 * Math.cos((latitude * Math.PI) / 180);
      const latDelta = radius / kmPerDegreeLat;
      const lngDelta = radius / kmPerDegreeLng;

      const stages = await this.prisma.tournamentStage.findMany({
        where: {
          latitude: { not: null, gte: latitude - latDelta, lte: latitude + latDelta },
          longitude: { not: null, gte: longitude - lngDelta, lte: longitude + lngDelta },
        },
        select: { tournamentId: true },
      });

      if (stages.length > 0) {
        const tournamentIds = [...new Set(stages.map((s) => s.tournamentId))];
        const nearbyMatches = await this.prisma.match.findMany({
          where: {
            status: MatchStatus.IN_PROGRESS,
            bracket: { tournamentId: { in: tournamentIds } },
          },
          include: this.nearbyMatchInclude,
        });

        for (const match of nearbyMatches) {
          if (merged.has(match.id)) continue;
          const mapped = this.mapNearbyMatch(match, latitude, longitude);
          if (mapped.distanceKm !== null && mapped.distanceKm <= radius) {
            merged.set(match.id, mapped);
          }
        }
      }
    }

    return Array.from(merged.values()).sort((a, b) => (a.distanceKm ?? -1) - (b.distanceKm ?? -1));
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getMatchModality(match: any): string | undefined {
    if (match.bracket?.category?.modality) {
      return match.bracket.category.modality;
    }
    // For friendly matches, check the friendly's modality field
    if (match.friendlyId && match.friendly?.modality) {
      return match.friendly.modality;
    }
    return undefined;
  }

  // Court volleyball requires a full 6-position lineup per team before points
  // can be scored for a given set — mirrors the app's mandatory lineup wizard,
  // enforced here too so the rule holds regardless of client.
  private async assertLineupComplete(match: any, matchId: string, setNumber: number) {
    if (this.getMatchModality(match) !== TournamentModality.COURT) return;

    const slots = await this.prisma.matchLineupSlot.findMany({
      where: { matchId, setNumber },
      select: { team: true },
    });
    const countA = slots.filter((s) => s.team === 'A').length;
    const countB = slots.filter((s) => s.team === 'B').length;
    if (countA < 6 || countB < 6) {
      throw AppError.lineupRequired();
    }
  }

  private async findMatchWithReferee(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        bracket: {
          select: {
            id: true,
            tournamentId: true,
            category: { select: { id: true, type: true, format: true, modality: true } },
          },
        },
        friendly: {
          select: {
            id: true,
            requesterId: true,
            requesterTeamId: true,
            challengedId: true,
            challengedTeamId: true,
            modality: true,
            date: true,
            startTime: true,
          },
        },
      },
    });

    if (!match) {
      throw AppError.matchNotFound();
    }

    // If refereeId is set, only referee can act
    if (match.refereeId) {
      if (match.refereeId !== userId) {
        throw AppError.notMatchReferee();
      }
      return match;
    }

    // For friendly matches (no bracket), authorize via friendly participants
    if (!match.bracketId && match.friendlyId && match.friendly) {
      const friendly = match.friendly;
      const isRequester = friendly.requesterId === userId;
      let isRequesterTeamOwner = false;
      let isChallenged = friendly.challengedId === userId;
      let isChallengedTeamOwner = false;

      if (!isRequester && friendly.requesterTeamId) {
        isRequesterTeamOwner = await this.isTeamOwner(friendly.requesterTeamId, userId);
      }
      if (!isChallenged && friendly.challengedTeamId) {
        isChallengedTeamOwner = await this.isTeamOwner(friendly.challengedTeamId, userId);
      }

      if (isRequester || isRequesterTeamOwner || isChallenged || isChallengedTeamOwner) {
        return match;
      }

      throw AppError.notMatchReferee();
    }

    // For tournament matches, only a confirmed tournament referee may act —
    // not the owner, not an admin, not any other athlete.
    const tournamentId = match.bracket!.tournamentId;
    const isTournamentReferee = await this.prisma.tournamentReferee.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!isTournamentReferee?.codeConfirmed) {
      throw AppError.notMatchReferee();
    }

    return match;
  }

  private async findMatchWithOwnership(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        bracket: {
          select: {
            id: true,
            tournamentId: true,
            category: { select: { id: true, type: true, format: true, modality: true } },
          },
        },
        friendly: {
          select: {
            id: true,
            requesterId: true,
            requesterTeamId: true,
            challengedId: true,
            challengedTeamId: true,
            modality: true,
            date: true,
            startTime: true,
          },
        },
      },
    });

    if (!match) {
      throw AppError.matchNotFound();
    }

    // For friendly matches (no bracket), authorize via friendly participants
    if (!match.bracketId && match.friendlyId && match.friendly) {
      const friendly = match.friendly;
      const isRequester = friendly.requesterId === userId;
      let isRequesterTeamOwner = false;
      let isChallenged = friendly.challengedId === userId;
      let isChallengedTeamOwner = false;

      if (!isRequester && friendly.requesterTeamId) {
        isRequesterTeamOwner = await this.isTeamOwner(friendly.requesterTeamId, userId);
      }
      if (!isChallenged && friendly.challengedTeamId) {
        isChallengedTeamOwner = await this.isTeamOwner(friendly.challengedTeamId, userId);
      }

      if (isRequester || isRequesterTeamOwner || isChallenged || isChallengedTeamOwner) {
        return match;
      }

      throw AppError.notTournamentOwner();
    }

    // For tournament matches, check tournament ownership
    if (!match.bracket) {
      throw AppError.matchNotFound();
    }

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: match.bracket.tournamentId },
    });

    if (!tournament || tournament.ownerId !== userId) {
      throw AppError.notTournamentOwner();
    }

    return match;
  }

  private async isTeamOwner(teamId: string, userId: string): Promise<boolean> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    return team?.ownerId === userId;
  }

  private async advanceWinner(tx: any, nextMatchId: string, winnerId: string) {
    const nextMatch = await tx.match.findUnique({ where: { id: nextMatchId } });
    if (!nextMatch) return;

    const updateData: any = {};
    if (!nextMatch.teamAId) {
      updateData.teamAId = winnerId;
    } else if (!nextMatch.teamBId) {
      updateData.teamBId = winnerId;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.match.update({ where: { id: nextMatchId }, data: updateData });
    }
  }

  private getWinningThreshold(modality: string | undefined): number {
    return modality === TournamentModality.BEACH ? 21 : 25;
  }

  private isWinningScore(
    scoreA: number,
    scoreB: number,
    modality: string | undefined,
    setNumber?: number,
    bestOfSets?: number | null,
    tiebreakScore?: number | null,
  ): boolean {
    const isTiebreakSet = bestOfSets && bestOfSets > 1 && setNumber === bestOfSets;
    const defaultThreshold = this.getWinningThreshold(modality);
    const threshold = isTiebreakSet ? (tiebreakScore ?? 15) : defaultThreshold;
    const diff = Math.abs(scoreA - scoreB);
    return (scoreA >= threshold || scoreB >= threshold) && diff >= 2;
  }

  private getSetsNeededToWin(bestOfSets: number): number {
    return Math.ceil(bestOfSets / 2);
  }

  private async countSetsWon(matchId: string): Promise<{ a: number; b: number }> {
    const sets = await this.prisma.matchSet.findMany({ where: { matchId } });
    let a = 0, b = 0;
    for (const s of sets) {
      if (s.scoreA > s.scoreB) a++;
      else if (s.scoreB > s.scoreA) b++;
    }
    return { a, b };
  }
}
