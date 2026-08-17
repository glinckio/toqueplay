import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { NotificationService } from '../../common/services/notification.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { GenerateBracketDto } from './dto/generate-bracket.dto';
import {
  TournamentStatus,
  RegistrationStatus,
  BracketType,
  MatchStatus,
} from '@prisma/client';

const BRACKET_INCLUDE = {
  category: { select: { id: true, type: true, format: true, modality: true, bestOfSets: true } },
  matches: {
    include: {
      teamA: { select: { id: true, name: true, avatarUrl: true } },
      teamB: { select: { id: true, name: true, avatarUrl: true } },
      winner: { select: { id: true, name: true, avatarUrl: true } },
      sets: { orderBy: { setNumber: 'asc' as const } },
      pointEvents: { orderBy: { timestamp: 'asc' as const } },
    },
    orderBy: [{ round: 'asc' as const }, { position: 'asc' as const }],
  },
};

@Injectable()
export class BracketsService {
  private readonly logger = new Logger(BracketsService.name);

  constructor(
    private prisma: PrismaService,
    private tournamentsService: TournamentsService,
    private notificationService: NotificationService,
  ) {}

  async generateBracket(tournamentId: string, userId: string, dto: GenerateBracketDto) {
    this.logger.debug(`generateBracket called tournamentId=${tournamentId} userId=${userId}`);

    const tournament = await this.tournamentsService.verifyOwnership(tournamentId, userId);
    this.logger.debug(`tournament status=${tournament.status}`);

    if (
      tournament.status !== TournamentStatus.REGISTRATION_CLOSED &&
      tournament.status !== TournamentStatus.REGISTRATION_OPEN &&
      tournament.status !== TournamentStatus.PUBLISHED
    ) {
      this.logger.warn(`generateBracket rejected: tournament not ready status=${tournament.status}`);
      throw AppError.tournamentNotReady();
    }

    const stages = await this.prisma.tournamentStage.findMany({
      where: { tournamentId },
      orderBy: { date: 'asc' },
    });

    if (stages.length > 0) {
      const nearestStage = stages[0];
      const twoDaysBefore = new Date(nearestStage.date);
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
      twoDaysBefore.setHours(0, 0, 0, 0);

      this.logger.debug(`stage date=${nearestStage.date.toISOString()} twoDaysBefore=${twoDaysBefore.toISOString()}`);

      if (new Date() < twoDaysBefore) {
        this.logger.warn(`generateBracket rejected: too early`);
        throw AppError.bracketTooEarly();
      }
    }

    const existing = await this.prisma.bracket.findUnique({
      where: { tournamentId_categoryId: { tournamentId, categoryId: dto.categoryId } },
    });
    if (existing) {
      throw AppError.bracketAlreadyGenerated();
    }

    const registrations = await this.prisma.registration.findMany({
      where: {
        tournamentId,
        categoryId: dto.categoryId,
        status: RegistrationStatus.CONFIRMED,
      },
      include: { team: { select: { id: true, name: true } } },
    });

    this.logger.debug(`confirmed registrations count=${registrations.length}`);

    if (registrations.length < 2) {
      this.logger.warn(`generateBracket rejected: not enough confirmed teams`);
      throw AppError.noConfirmedTeams();
    }

    const teamIds = registrations.map((r) => r.teamId);

    // Always fetch category for bestOfSets
    const category = await this.prisma.tournamentCategory.findUnique({ where: { id: dto.categoryId } });
    const bestOfSets = category?.bestOfSets ?? 1;
    const semifinalBestOfSets = (category as any)?.semifinalBestOfSets ?? bestOfSets;
    const finalBestOfSets = (category as any)?.finalBestOfSets ?? bestOfSets;
    const tiebreakScore = (category as any)?.tiebreakScore ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const bracket = await tx.bracket.create({
        data: {
          tournamentId,
          categoryId: dto.categoryId,
          type: dto.type,
        },
      });

      if (dto.type === BracketType.SINGLE_ELIMINATION) {
        await this.generateSingleElimination(tx, bracket.id, teamIds, bestOfSets, semifinalBestOfSets, finalBestOfSets, tiebreakScore);
      } else if (dto.type === BracketType.DOUBLE_ELIMINATION) {
        await this.generateDoubleElimination(tx, bracket.id, teamIds, bestOfSets, semifinalBestOfSets, finalBestOfSets, tiebreakScore);
      } else if (dto.type === BracketType.ROUND_ROBIN) {
        await this.generateRoundRobin(tx, bracket.id, teamIds, bestOfSets, semifinalBestOfSets, finalBestOfSets, tiebreakScore);
      } else if (dto.type === BracketType.GROUPS_THEN_ELIMINATION) {
        await this.generateGroupsThenElimination(tx, bracket.id, teamIds, category!, bestOfSets, semifinalBestOfSets, finalBestOfSets);
      } else {
        throw AppError.invalidBracketType();
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatus.BRACKET_GENERATED },
      });

      return tx.bracket.findUnique({
        where: { id: bracket.id },
        include: BRACKET_INCLUDE,
      });
    });

    // Notify confirmed teams about bracket generation
    const tournamentData = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (tournamentData) {
      const userIds = await this.notificationService.getRegisteredAthleteUserIds(tournamentId);
      await this.notificationService.sendToUsers(userIds, {
        title: 'Chaveamento Gerado!',
        body: `O chaveamento do torneio "${tournamentData.name}" foi gerado. Confira!`,
        type: 'BRACKET_GENERATED',
        referenceId: tournamentId,
      });
    }

    return result;
  }

  private async generateSingleElimination(
    tx: any,
    bracketId: string,
    teamIds: string[],
    bestOfSets: number,
    semifinalBestOfSets: number,
    finalBestOfSets: number,
    tiebreakScore: number | null,
  ) {
    const numTeams = teamIds.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const totalSlots = Math.pow(2, numRounds);

    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

    const matchMap: Map<string, string> = new Map();

    for (let round = numRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, numRounds - round);

      for (let pos = 0; pos < matchesInRound; pos++) {
        const nextRoundKey = round < numRounds ? `${round + 1}-${Math.floor(pos / 2)}` : null;

        const matchData: any = {
          bracketId,
          round,
          position: pos,
          status: MatchStatus.SCHEDULED,
          bestOfSets,
        };

        // Labels for elimination rounds + override bestOfSets
        if (round === numRounds) {
          matchData.label = 'FINAL';
          matchData.bestOfSets = finalBestOfSets;
          if (tiebreakScore) matchData.tiebreakScore = tiebreakScore;
        } else if (round === numRounds - 1) {
          matchData.label = 'SEMIFINAL';
          matchData.bestOfSets = semifinalBestOfSets;
          if (tiebreakScore) matchData.tiebreakScore = tiebreakScore;
        }

        if (nextRoundKey && matchMap.has(nextRoundKey)) {
          matchData.nextMatchId = matchMap.get(nextRoundKey);
        }

        if (round === 1) {
          const teamAIndex = pos * 2;
          const teamBIndex = pos * 2 + 1;

          if (teamAIndex < shuffled.length) {
            matchData.teamAId = shuffled[teamAIndex];
          }
          if (teamBIndex < shuffled.length) {
            matchData.teamBId = shuffled[teamBIndex];
          }
        }

        const match = await tx.match.create({ data: matchData });
        matchMap.set(`${round}-${pos}`, match.id);

        if (round === 1 && matchData.teamAId && !matchData.teamBId && matchData.nextMatchId) {
          await this.advanceTeamToNextMatch(tx, matchData.nextMatchId, matchData.teamAId, 'A');
          await tx.match.update({
            where: { id: match.id },
            data: { status: MatchStatus.WALKOVER, winnerId: matchData.teamAId },
          });
        } else if (round === 1 && !matchData.teamAId && matchData.teamBId && matchData.nextMatchId) {
          await this.advanceTeamToNextMatch(tx, matchData.nextMatchId, matchData.teamBId, 'B');
          await tx.match.update({
            where: { id: match.id },
            data: { status: MatchStatus.WALKOVER, winnerId: matchData.teamBId },
          });
        }
      }
    }
  }

  private async advanceTeamToNextMatch(
    tx: any,
    nextMatchId: string,
    teamId: string,
    slot: 'A' | 'B',
  ) {
    const nextMatch = await tx.match.findUnique({ where: { id: nextMatchId } });
    if (!nextMatch) return;

    const updateData: any = {};
    if (!nextMatch.teamAId) {
      updateData.teamAId = teamId;
    } else if (!nextMatch.teamBId) {
      updateData.teamBId = teamId;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.match.update({ where: { id: nextMatchId }, data: updateData });
    }
  }

  private async generateDoubleElimination(
    tx: any,
    bracketId: string,
    teamIds: string[],
    bestOfSets: number,
    semifinalBestOfSets: number,
    finalBestOfSets: number,
    tiebreakScore: number | null,
  ) {
    const numTeams = teamIds.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const totalSlots = Math.pow(2, numRounds);
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

    const matchMap: Map<string, string> = new Map();

    // ─── Winners Bracket (group 0) ───
    for (let round = numRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, numRounds - round);

      for (let pos = 0; pos < matchesInRound; pos++) {
        const nextRoundKey = round < numRounds ? `W${round + 1}-${Math.floor(pos / 2)}` : null;

        const matchData: any = {
          bracketId,
          round,
          position: pos,
          group: 0,
          status: MatchStatus.SCHEDULED,
          bestOfSets,
        };

        if (round === numRounds) {
          matchData.label = 'WF'; // Winners Final
          matchData.bestOfSets = finalBestOfSets;
          if (tiebreakScore) matchData.tiebreakScore = tiebreakScore;
        } else if (round === numRounds - 1) {
          matchData.label = 'WS'; // Winners Semifinal
          matchData.bestOfSets = semifinalBestOfSets;
          if (tiebreakScore) matchData.tiebreakScore = tiebreakScore;
        }

        if (nextRoundKey && matchMap.has(nextRoundKey)) {
          matchData.nextMatchId = matchMap.get(nextRoundKey);
        }

        if (round === 1) {
          const teamAIndex = pos * 2;
          const teamBIndex = pos * 2 + 1;
          if (teamAIndex < shuffled.length) matchData.teamAId = shuffled[teamAIndex];
          if (teamBIndex < shuffled.length) matchData.teamBId = shuffled[teamBIndex];
        }

        const match = await tx.match.create({ data: matchData });
        matchMap.set(`W${round}-${pos}`, match.id);

        // Walkover handling for winners bracket round 1
        if (round === 1 && matchData.teamAId && !matchData.teamBId && matchData.nextMatchId) {
          await this.advanceTeamToNextMatch(tx, matchData.nextMatchId, matchData.teamAId, 'A');
          await tx.match.update({
            where: { id: match.id },
            data: { status: MatchStatus.WALKOVER, winnerId: matchData.teamAId },
          });
        } else if (round === 1 && !matchData.teamAId && matchData.teamBId && matchData.nextMatchId) {
          await this.advanceTeamToNextMatch(tx, matchData.nextMatchId, matchData.teamBId, 'B');
          await tx.match.update({
            where: { id: match.id },
            data: { status: MatchStatus.WALKOVER, winnerId: matchData.teamBId },
          });
        }
      }
    }

    // ─── Losers Bracket (group 1) ───
    // In a standard double elimination:
    // - Losers round 1: losers from winners round 1 play each other
    // - Losers round 2: winners of losers round 1 play losers from winners round 2
    // - This pattern continues: losers round N feeds from winners round N and previous losers round
    // - Number of losers rounds = 2 * (numRounds - 1)
    const losersRounds = 2 * (numRounds - 1);
    let losersMatchCount = 0;

    for (let lr = 1; lr <= losersRounds; lr++) {
      // Number of matches in this losers round
      // Odd rounds: half the remaining losers play each other
      // Even rounds: winners from previous losers round face new losers from winners bracket
      let matchesInLr: number;
      if (lr === losersRounds) {
        matchesInLr = 1; // Losers final
      } else {
        // Calculate based on remaining teams in losers bracket
        const winnersRoundFeeding = Math.ceil(lr / 2) + 1; // which winners round feeds this losers round
        const matchesInWinnersRound = Math.pow(2, numRounds - winnersRoundFeeding);
        matchesInLr = lr % 2 === 1
          ? matchesInWinnersRound / 2  // consolidation round
          : matchesInWinnersRound;     // mixed round
        if (matchesInLr < 1) matchesInLr = 1;
      }

      for (let pos = 0; pos < matchesInLr; pos++) {
        const matchData: any = {
          bracketId,
          round: lr,
          position: pos,
          group: 1,
          status: MatchStatus.SCHEDULED,
          bestOfSets,
        };

        if (lr === losersRounds) {
          matchData.label = 'LF'; // Losers Final
          matchData.bestOfSets = finalBestOfSets;
          if (tiebreakScore) matchData.tiebreakScore = tiebreakScore;
        }

        // Link to next losers round or grand final
        if (lr < losersRounds) {
          const nextLrKey = `L${lr + 1}-${Math.floor(pos / 2)}`;
          if (matchMap.has(nextLrKey)) {
            matchData.nextMatchId = matchMap.get(nextLrKey);
          }
        }

        const match = await tx.match.create({ data: matchData });
        matchMap.set(`L${lr}-${pos}`, match.id);
        losersMatchCount++;
      }
    }

    // ─── Grand Final (group 2) ───
    const winnersFinalId = matchMap.get(`W${numRounds}-0`);
    const losersFinalId = matchMap.get(`L${losersRounds}-0`);

    const grandFinal = await tx.match.create({
      data: {
        bracketId,
        round: numRounds + losersRounds + 1,
        position: 0,
        group: 2,
        status: MatchStatus.SCHEDULED,
        bestOfSets: finalBestOfSets,
        tiebreakScore,
        label: 'GRAND_FINAL',
      },
    });

    // Link winners final and losers final to grand final
    if (winnersFinalId) {
      await tx.match.update({
        where: { id: winnersFinalId },
        data: { nextMatchId: grandFinal.id },
      });
    }
    if (losersFinalId) {
      await tx.match.update({
        where: { id: losersFinalId },
        data: { nextMatchId: grandFinal.id },
      });
    }
  }

  private async generateRoundRobin(
    tx: any,
    bracketId: string,
    teamIds: string[],
    bestOfSets: number,
    semifinalBestOfSets: number,
    finalBestOfSets: number,
    tiebreakScore: number | null,
  ) {
    const numTeams = teamIds.length;
    let round = 1;
    let position = 0;
    const matchesPerRound = Math.floor(numTeams / 2);

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        if (position >= matchesPerRound) {
          round++;
          position = 0;
        }

        await tx.match.create({
          data: {
            bracketId,
            round,
            position,
            status: MatchStatus.SCHEDULED,
            teamAId: teamIds[i],
            teamBId: teamIds[j],
            bestOfSets,
          },
        });

        position++;
      }
    }

    // Create playoff matches (3rd place + final) with TBD teams
    if (numTeams >= 4) {
      const playoffRound = round + 1;

      // 3rd place match (position 0)
      await tx.match.create({
        data: {
          bracketId,
          round: playoffRound,
          position: 0,
          status: MatchStatus.SCHEDULED,
          bestOfSets: semifinalBestOfSets,
          tiebreakScore,
          label: 'TERCEIRO_LUGAR',
        },
      });

      // Final match (position 1)
      await tx.match.create({
        data: {
          bracketId,
          round: playoffRound,
          position: 1,
          status: MatchStatus.SCHEDULED,
          bestOfSets: finalBestOfSets,
          tiebreakScore,
          label: 'FINAL',
        },
      });
    }
  }

  private async generateGroupsThenElimination(
    tx: any,
    bracketId: string,
    teamIds: string[],
    category: { groupsCount?: number | null; teamsPerGroup?: number | null; teamsAdvancing?: number | null },
    bestOfSets: number,
    semifinalBestOfSets: number,
    finalBestOfSets: number,
  ) {
    const numTeams = teamIds.length;
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

    // Default: max 5 teams per group
    const DEFAULT_TEAMS_PER_GROUP = 5;

    // Determine teams per group
    let teamsPerGroup: number;
    if (category.teamsPerGroup) {
      teamsPerGroup = category.teamsPerGroup;
    } else if (category.groupsCount) {
      teamsPerGroup = Math.ceil(numTeams / category.groupsCount);
    } else {
      teamsPerGroup = DEFAULT_TEAMS_PER_GROUP;
    }

    // Determine number of groups
    const groupsCount = Math.max(2, Math.ceil(numTeams / teamsPerGroup));

    // Recalculate actual teams per group (after rounding)
    const actualTeamsPerGroup = Math.ceil(numTeams / groupsCount);

    // Default advancing rules:
    // 3 or fewer per group → all advance (todos contra todos)
    // 4 per group → top 3 advance
    // 5+ per group → top 3 advance
    let teamsAdvancing: number;
    if (category.teamsAdvancing) {
      teamsAdvancing = category.teamsAdvancing;
    } else if (actualTeamsPerGroup <= 3) {
      teamsAdvancing = actualTeamsPerGroup; // all advance
    } else {
      teamsAdvancing = 3; // top 3
    }

    // If all teams advance from each group, skip elimination phase
    const needsElimination = teamsAdvancing < actualTeamsPerGroup;

    // Distribute teams evenly across groups
    const groups: string[][] = Array.from({ length: groupsCount }, () => []);
    for (let i = 0; i < shuffled.length; i++) {
      groups[i % groupsCount].push(shuffled[i]);
    }

    // Create round-robin matches within each group
    for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
      const groupTeams = groups[groupIdx];
      let round = 1;
      let position = 0;
      const matchesPerRound = Math.floor(groupTeams.length / 2);

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          if (matchesPerRound > 0 && position >= matchesPerRound) {
            round++;
            position = 0;
          }

          await tx.match.create({
            data: {
              bracketId,
              round,
              position,
              status: MatchStatus.SCHEDULED,
              teamAId: groupTeams[i],
              teamBId: groupTeams[j],
              group: groupIdx,
              bestOfSets,
            },
          });

          position++;
        }
      }
    }

    // Create elimination bracket with TBD slots (only if not all advance)
    if (needsElimination) {
      const totalAdvancing = groupsCount * teamsAdvancing;
      const numRounds = Math.ceil(Math.log2(totalAdvancing));
      const totalSlots = Math.pow(2, numRounds);

    const matchMap: Map<string, string> = new Map();

    // Elimination round numbers start after group rounds
    // Use high round numbers to separate from group phase
    const eliminationRoundOffset = 100;

    for (let round = numRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, numRounds - round);

      for (let pos = 0; pos < matchesInRound; pos++) {
        const nextRoundKey = round < numRounds ? `${round + 1}-${Math.floor(pos / 2)}` : null;

        const matchData: any = {
          bracketId,
          round: round + eliminationRoundOffset,
          position: pos,
          status: MatchStatus.SCHEDULED,
          group: null, // null = elimination phase
          bestOfSets,
        };

        // Labels for elimination rounds + override bestOfSets
        if (round === numRounds) {
          matchData.label = 'FINAL';
          matchData.bestOfSets = finalBestOfSets;
          if ((category as any)?.tiebreakScore) matchData.tiebreakScore = (category as any).tiebreakScore;
        } else if (round === numRounds - 1) {
          matchData.label = 'SEMIFINAL';
          matchData.bestOfSets = semifinalBestOfSets;
          if ((category as any)?.tiebreakScore) matchData.tiebreakScore = (category as any).tiebreakScore;
        }

        if (nextRoundKey && matchMap.has(nextRoundKey)) {
          matchData.nextMatchId = matchMap.get(nextRoundKey);
        }

        // First elimination round: leave TBD (teams fill in after group phase)
        const match = await tx.match.create({ data: matchData });
        matchMap.set(`${round}-${pos}`, match.id);
      }
    }
    } // end if (needsElimination)
  }

  /**
   * Check if all group matches are finished and auto-advance teams to elimination.
   * Called after each group match finishes.
   */
  async checkAndAdvanceGroupTeams(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { bracket: true },
    });
    if (!match || !match.bracket || match.group === null) return;
    if (match.bracket.type !== BracketType.GROUPS_THEN_ELIMINATION) return;

    const bracketId = match.bracketId!;

    // Check if all group matches are finished
    const groupMatches = await this.prisma.match.findMany({
      where: { bracketId, group: { not: null } },
      include: { sets: true },
    });

    const allFinished = groupMatches.every(
      (m) => m.status === MatchStatus.FINISHED || m.status === MatchStatus.WALKOVER,
    );
    if (!allFinished) return;

    // Get category config
    const category = await this.prisma.tournamentCategory.findUnique({
      where: { id: match.bracket.categoryId },
    });
    if (!category || !category.teamsAdvancing) return;

    // Compute standings per group
    const groups = new Map<number, Map<string, { wins: number; pointsFor: number; pointsAgainst: number }>>();

    for (const m of groupMatches) {
      const g = m.group!;
      if (!groups.has(g)) groups.set(g, new Map());

      const gMap = groups.get(g)!;
      const teamAId = m.teamAId!;
      const teamBId = m.teamBId!;

      if (!gMap.has(teamAId)) gMap.set(teamAId, { wins: 0, pointsFor: 0, pointsAgainst: 0 });
      if (!gMap.has(teamBId)) gMap.set(teamBId, { wins: 0, pointsFor: 0, pointsAgainst: 0 });

      const a = gMap.get(teamAId)!;
      const b = gMap.get(teamBId)!;

      // Sum actual points from sets
      const ptsA = m.sets.reduce((sum: number, s: any) => sum + s.scoreA, 0);
      const ptsB = m.sets.reduce((sum: number, s: any) => sum + s.scoreB, 0);
      a.pointsFor += ptsA;
      a.pointsAgainst += ptsB;
      b.pointsFor += ptsB;
      b.pointsAgainst += ptsA;

      if (m.scoreTeamA > m.scoreTeamB) a.wins++;
      else if (m.scoreTeamB > m.scoreTeamA) b.wins++;
    }

    // Sort each group and pick top N
    const advancingTeams: string[] = [];
    const sortedGroupIndexes = [...groups.keys()].sort((a, b) => a - b);

    for (const gIdx of sortedGroupIndexes) {
      const gMap = groups.get(gIdx)!;
      const sorted = [...gMap.entries()].sort((a, b) => {
        if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
        const saldoA = a[1].pointsFor - a[1].pointsAgainst;
        const saldoB = b[1].pointsFor - b[1].pointsAgainst;
        if (saldoB !== saldoA) return saldoB - saldoA;
        return b[1].pointsFor - a[1].pointsFor;
      });
      const topN = sorted.slice(0, category.teamsAdvancing).map(([id]) => id);
      advancingTeams.push(...topN);
    }

    // Shuffle advancing teams (or keep group order for bracket seeding)
    // Keep group order: 1st of A, 1st of B, 1st of C, 2nd of A, 2nd of B, 2nd of C, ...
    const reordered: string[] = [];
    const maxAdvance = category.teamsAdvancing;
    for (let pos = 0; pos < maxAdvance; pos++) {
      for (const gIdx of sortedGroupIndexes) {
        const gMap = groups.get(gIdx)!;
        const sorted = [...gMap.entries()].sort((a, b) => {
          if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
          const saldoA = a[1].pointsFor - a[1].pointsAgainst;
          const saldoB = b[1].pointsFor - b[1].pointsAgainst;
          if (saldoB !== saldoA) return saldoB - saldoA;
          return b[1].pointsFor - a[1].pointsFor;
        });
        if (sorted[pos]) reordered.push(sorted[pos][0]);
      }
    }

    // Fill elimination bracket slots
    const eliminationMatches = await this.prisma.match.findMany({
      where: { bracketId, group: null },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    });

    // Find first elimination round matches
    const minRound = Math.min(...eliminationMatches.map((m) => m.round));
    const firstRoundMatches = eliminationMatches.filter((m) => m.round === minRound);

    let teamIdx = 0;
    for (const elimMatch of firstRoundMatches) {
      const updateData: any = {};
      if (!elimMatch.teamAId && teamIdx < reordered.length) {
        updateData.teamAId = reordered[teamIdx++];
      }
      if (!elimMatch.teamBId && teamIdx < reordered.length) {
        updateData.teamBId = reordered[teamIdx++];
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.match.update({ where: { id: elimMatch.id }, data: updateData });

        // Check for walkover (only one team placed)
        const updated = await this.prisma.match.findUnique({ where: { id: elimMatch.id } });
        if (updated?.teamAId && !updated?.teamBId) {
          if (updated.nextMatchId) {
            await this.fillNextMatchSlot(updated.nextMatchId, updated.teamAId);
          }
          await this.prisma.match.update({
            where: { id: updated.id },
            data: { status: MatchStatus.WALKOVER, winnerId: updated.teamAId },
          });
        } else if (!updated?.teamAId && updated?.teamBId) {
          if (updated.nextMatchId) {
            await this.fillNextMatchSlot(updated.nextMatchId, updated.teamBId);
          }
          await this.prisma.match.update({
            where: { id: updated.id },
            data: { status: MatchStatus.WALKOVER, winnerId: updated.teamBId },
          });
        }
      }
    }
  }

  /**
   * Fill the first empty slot (teamA or teamB) in the next match.
   * Works with both tx and prisma client.
   */
  private async fillNextMatchSlot(nextMatchId: string, teamId: string) {
    const nextMatch = await this.prisma.match.findUnique({ where: { id: nextMatchId } });
    if (!nextMatch) return;

    const updateData: any = {};
    if (!nextMatch.teamAId) {
      updateData.teamAId = teamId;
    } else if (!nextMatch.teamBId) {
      updateData.teamBId = teamId;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.match.update({ where: { id: nextMatchId }, data: updateData });
    }
  }

  /**
   * Check if all round-robin matches are finished and auto-advance teams to playoff matches.
   * Ranking: 1st vs 2nd → Final, 3rd vs 4th → 3rd place, etc.
   * Playoff matches must exist with higher round numbers and null group.
   */
  async checkAndAdvanceRoundRobinTeams(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { bracket: true },
    });
    if (!match || !match.bracket) return;
    if (match.bracket.type !== BracketType.ROUND_ROBIN) return;
    if (match.group !== null) return;

    const bracketId = match.bracketId!;

    // Get all matches: identify RR phase (no nextMatchId, lower rounds) vs playoff phase
    const allMatches = await this.prisma.match.findMany({
      where: { bracketId },
      include: { sets: true },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    });

    // Find the max round of the RR phase (matches without nextMatchId or before playoff rounds)
    // Playoff matches are those with group === null and round > max RR round
    // RR matches are the ones with teams already assigned from the start
    // Simplest: RR matches are those that had both teams assigned at creation time
    // We detect playoff matches as those with at least one null team
    const rrMatches = allMatches.filter(
      (m) => m.teamAId !== null && m.teamBId !== null && m.group === null,
    );

    // If no RR matches found, nothing to do
    if (rrMatches.length === 0) return;

    // Check if all RR matches are finished
    const allFinished = rrMatches.every(
      (m) => m.status === MatchStatus.FINISHED || m.status === MatchStatus.WALKOVER,
    );
    if (!allFinished) return;

    // Check if playoff matches already have teams assigned (avoid re-running)
    const playoffMatches = allMatches.filter(
      (m) => (m.teamAId === null || m.teamBId === null) && m.group === null,
    );

    // If no playoff matches exist, nothing to advance to
    if (playoffMatches.length === 0) return;

    // Check if any playoff match already has teams assigned (already advanced)
    const alreadyAdvanced = playoffMatches.some((m) => m.teamAId !== null || m.teamBId !== null);
    if (alreadyAdvanced) return;

    // Compute standings from RR matches
    const standings = new Map<string, { wins: number; pointsFor: number; pointsAgainst: number }>();

    for (const m of rrMatches) {
      const teamAId = m.teamAId!;
      const teamBId = m.teamBId!;

      if (!standings.has(teamAId)) standings.set(teamAId, { wins: 0, pointsFor: 0, pointsAgainst: 0 });
      if (!standings.has(teamBId)) standings.set(teamBId, { wins: 0, pointsFor: 0, pointsAgainst: 0 });

      const a = standings.get(teamAId)!;
      const b = standings.get(teamBId)!;

      // Sum actual points from sets
      const ptsA = (m as any).sets?.reduce((sum: number, s: any) => sum + s.scoreA, 0) ?? m.scoreTeamA ?? 0;
      const ptsB = (m as any).sets?.reduce((sum: number, s: any) => sum + s.scoreB, 0) ?? m.scoreTeamB ?? 0;
      a.pointsFor += ptsA;
      a.pointsAgainst += ptsB;
      b.pointsFor += ptsB;
      b.pointsAgainst += ptsA;

      if (m.scoreTeamA > m.scoreTeamB) a.wins++;
      else if (m.scoreTeamB > m.scoreTeamA) b.wins++;
      // Walkover: winnerId determines the winner
      else if (m.winnerId === teamAId) a.wins++;
      else if (m.winnerId === teamBId) b.wins++;
    }

    // Sort standings: wins → point differential → points for
    const sorted = [...standings.entries()].sort((a, b) => {
      if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
      const saldoA = a[1].pointsFor - a[1].pointsAgainst;
      const saldoB = b[1].pointsFor - b[1].pointsAgainst;
      if (saldoB !== saldoA) return saldoB - saldoA;
      return b[1].pointsFor - a[1].pointsFor;
    });

    const rankedTeamIds = sorted.map(([id]) => id);

    // Fill playoff matches: position 0 = 3rd place (3rd vs 4th), position 1 = final (1st vs 2nd)
    // Sort playoff matches by position ascending
    const sortedPlayoffs = [...playoffMatches].sort((a, b) => a.position - b.position);

    // Standard pattern for N teams:
    // Last playoff match (highest position) = Final: ranked[0] vs ranked[1]
    // Second-to-last = 3rd place: ranked[2] vs ranked[3]
    // etc.
    for (let i = sortedPlayoffs.length - 1; i >= 0; i--) {
      const playoff = sortedPlayoffs[i];
      const teamIndex = (sortedPlayoffs.length - 1 - i) * 2;

      const updateData: any = {};
      if (rankedTeamIds[teamIndex]) {
        updateData.teamAId = rankedTeamIds[teamIndex];
      }
      if (rankedTeamIds[teamIndex + 1]) {
        updateData.teamBId = rankedTeamIds[teamIndex + 1];
      }

      // Labels: last match = FINAL, second-to-last = TERCEIRO_LUGAR
      if (i === sortedPlayoffs.length - 1) {
        updateData.label = 'FINAL';
      } else if (i === sortedPlayoffs.length - 2) {
        updateData.label = 'TERCEIRO_LUGAR';
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.match.update({
          where: { id: playoff.id },
          data: updateData,
        });
      }
    }
  }

  async getBracket(tournamentId: string, categoryId?: string) {
    const where: any = { tournamentId };
    if (categoryId) where.categoryId = categoryId;

    const brackets = await this.prisma.bracket.findMany({
      where,
      include: BRACKET_INCLUDE,
    });

    if (categoryId && brackets.length === 0) {
      throw AppError.bracketNotFound();
    }

    return brackets.map((bracket) => ({
      ...bracket,
      rounds: this.groupByRound(bracket.matches),
    }));
  }

  private groupByRound(matches: any[]) {
    const rounds: Record<number, any[]> = {};
    for (const match of matches) {
      if (!rounds[match.round]) rounds[match.round] = [];
      rounds[match.round].push(match);
    }
    return rounds;
  }
}
