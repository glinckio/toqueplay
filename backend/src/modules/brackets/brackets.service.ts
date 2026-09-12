import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { NotificationService } from '../../common/services/notification.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { GenerateBracketDto } from './dto/generate-bracket.dto';
import { ScheduleMatchesDto } from './dto/schedule-matches.dto';
import {
  TournamentStatus,
  RegistrationStatus,
  BracketType,
  MatchStatus,
  TournamentEventType,
} from '@prisma/client';

// Practical minimums so brackets don't produce degenerate/pointless structures.
// Elimination formats work mathematically from 2 teams (byes handle the rest),
// but a 2-team single/double elimination bracket is just one match dressed up —
// these thresholds match common tournament-software convention.
/**
 * Formatos permitidos por tipo de competicao.
 *
 * A liga nao aceita eliminacao dupla: o "bracket reset" (quem vem da chave de perdedores vence a
 * final e obriga uma segunda final) faz o total de partidas so ser conhecido no fim. Isso quebra
 * o planejamento de datas, que precisa do numero de jogos antes de comecar.
 */
const ALLOWED_BRACKET_TYPES: Record<TournamentEventType, BracketType[]> = {
  [TournamentEventType.SINGLE]: Object.values(BracketType),
  [TournamentEventType.CIRCUIT]: Object.values(BracketType),
  [TournamentEventType.LEAGUE]: [
    BracketType.ROUND_ROBIN,
    BracketType.GROUPS_THEN_ELIMINATION,
    BracketType.SINGLE_ELIMINATION,
  ],
};

const MIN_TEAMS_BY_BRACKET_TYPE: Record<BracketType, number> = {
  [BracketType.SINGLE_ELIMINATION]: 3,
  [BracketType.DOUBLE_ELIMINATION]: 4,
  [BracketType.ROUND_ROBIN]: 3,
  [BracketType.GROUPS_THEN_ELIMINATION]: 4,
};

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
    // group and id break ties: matches from different brackets/groups can share
    // the same (round, position) — without these, Postgres doesn't guarantee a
    // stable order for tied rows, so the list visibly reshuffled between fetches.
    orderBy: [
      { group: 'asc' as const },
      { round: 'asc' as const },
      { position: 'asc' as const },
      { id: 'asc' as const },
    ],
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

    if (tournament.status !== TournamentStatus.REGISTRATION_CLOSED) {
      this.logger.warn(`generateBracket rejected: tournament not ready status=${tournament.status}`);
      throw AppError.tournamentNotReady();
    }

    // Circuito gera uma chave por etapa, entao o cliente diz qual. Torneio unico e liga tem uma
    // etapa so e o sistema resolve sozinho.
    const stages = await this.prisma.tournamentStage.findMany({
      where: { tournamentId },
      orderBy: { date: 'asc' },
    });
    if (stages.length === 0) {
      throw AppError.stageNotFound();
    }

    let stage = stages[0];
    if (dto.stageId) {
      const escolhida = stages.find((s) => s.id === dto.stageId);
      if (!escolhida) throw AppError.stageNotFound();
      stage = escolhida;
    } else if (tournament.eventType === TournamentEventType.CIRCUIT) {
      throw AppError.stageRequiredForCircuit();
    }

    {
      const twoDaysBefore = new Date(stage.date);
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
      twoDaysBefore.setHours(0, 0, 0, 0);

      this.logger.debug(`stage date=${stage.date.toISOString()} twoDaysBefore=${twoDaysBefore.toISOString()}`);

      if (new Date() < twoDaysBefore) {
        this.logger.warn(`generateBracket rejected: too early`);
        throw AppError.bracketTooEarly();
      }
    }

    const existing = await this.prisma.bracket.findUnique({
      where: { categoryId_stageId: { categoryId: dto.categoryId, stageId: stage.id } },
    });
    if (existing) {
      throw AppError.bracketAlreadyGenerated();
    }

    // Somente quem se inscreveu NESTA etapa entra na chave — e o que permite o circuito ter
    // times diferentes a cada etapa.
    const registrations = await this.prisma.registration.findMany({
      where: {
        stageId: stage.id,
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

    if (!ALLOWED_BRACKET_TYPES[tournament.eventType].includes(dto.type)) {
      this.logger.warn(`generateBracket rejected: ${dto.type} nao permitido em ${tournament.eventType}`);
      throw AppError.bracketTypeNotAllowed();
    }

    const minTeams = MIN_TEAMS_BY_BRACKET_TYPE[dto.type];
    if (minTeams && registrations.length < minTeams) {
      this.logger.warn(`generateBracket rejected: ${registrations.length} teams < min ${minTeams} for ${dto.type}`);
      throw AppError.invalidTeamCount();
    }

    // Organizer-chosen group count only makes sense with >=2 teams per group —
    // otherwise a group of 1 can't play a round-robin against itself.
    if (dto.type === BracketType.GROUPS_THEN_ELIMINATION && dto.groupsCount) {
      const maxGroups = Math.floor(registrations.length / 2);
      if (dto.groupsCount > maxGroups) {
        this.logger.warn(`generateBracket rejected: groupsCount=${dto.groupsCount} exceeds max ${maxGroups} for ${registrations.length} teams`);
        throw AppError.invalidTeamCount();
      }
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
          stageId: stage.id,
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
        // Organizer's explicit groupsCount (chosen at generation time) wins over
        // whatever is stored on the category — that field is never set by the
        // create-tournament flow today, so this is the only real place it's configured.
        const groupsConfig = dto.groupsCount
          ? { ...category, groupsCount: dto.groupsCount, teamsPerGroup: null }
          : category!;
        await this.generateGroupsThenElimination(tx, bracket.id, teamIds, groupsConfig, bestOfSets, semifinalBestOfSets, finalBestOfSets);
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
    const tournamentData = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, deletedAt: null },
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

  /**
   * Splits round-1 slots between byes (single team, auto-advances) and real
   * matches (two teams), so a non-power-of-2 team count never leaves a match
   * with zero teams. `matchesInRound` is the first-round match count (=
   * totalSlots / 2); byes = totalSlots - numTeams. The first `byes` slots get
   * one team each, the rest pair up two teams per slot — this uses every team
   * exactly once (byes*1 + (matchesInRound-byes)*2 === numTeams).
   */
  private assignFirstRoundSlots(
    shuffled: string[],
    matchesInRound: number,
  ): Array<{ teamAId?: string; teamBId?: string }> {
    const numTeams = shuffled.length;
    const byes = matchesInRound * 2 - numTeams;
    const slots: Array<{ teamAId?: string; teamBId?: string }> = [];
    let cursor = 0;
    for (let pos = 0; pos < matchesInRound; pos++) {
      if (pos < byes) {
        slots.push({ teamAId: shuffled[cursor++] });
      } else {
        slots.push({ teamAId: shuffled[cursor++], teamBId: shuffled[cursor++] });
      }
    }
    return slots;
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
    const firstRoundSlots = this.assignFirstRoundSlots(shuffled, totalSlots / 2);

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
          const slot = firstRoundSlots[pos];
          if (slot.teamAId) matchData.teamAId = slot.teamAId;
          if (slot.teamBId) matchData.teamBId = slot.teamBId;
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
    const firstRoundSlots = this.assignFirstRoundSlots(shuffled, totalSlots / 2);

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
          const slot = firstRoundSlots[pos];
          if (slot.teamAId) matchData.teamAId = slot.teamAId;
          if (slot.teamBId) matchData.teamBId = slot.teamBId;
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
    // NOT precreated here. A fixed pre-planned grid (what used to be built in
    // this spot) assumes the losers bracket's round sizes stay in lockstep
    // with the winners bracket's — true only when the team count is an exact
    // power of 2. The moment round-1 byes shrink the real loser count, every
    // later round's size drifts out of sync with the fixed winners-bracket
    // sizes feeding it, and the grid either strands matches with zero teams
    // or leaves teams with no opponent to advance past.
    //
    // Instead, losers-bracket matches are created ON DEMAND by
    // `advanceDoubleElimination` (called from matches.service.ts whenever a
    // match finishes): each arriving loser/winner is placed into the next
    // open slot of its target round, or a new match is created for it if none
    // is open. A round's exact size is therefore whatever it turns out to be
    // — no formula to get wrong — and `placeInLosersBracketRound` walks over
    // any team left without an opponent once every expected arrival for that
    // round has shown up (computed via `computeLosersTopology`, still a pure
    // function of team count/byes, just no longer used to pre-lay a grid).

    // ─── Grand Final (group 2) ───
    // Created empty now; the winners-bracket champion and the losers-bracket
    // champion are routed into it later (WB final's nextMatchId already
    // points here; the losers final is wired to it the moment
    // placeInLosersBracketRound creates that match).
    const winnersFinalId = matchMap.get(`W${numRounds}-0`);

    const grandFinal = await tx.match.create({
      data: {
        bracketId,
        round: numRounds + 2 * (numRounds - 1) + 1,
        position: 0,
        group: 2,
        status: MatchStatus.SCHEDULED,
        bestOfSets: finalBestOfSets,
        tiebreakScore,
        label: 'GRAND_FINAL',
      },
    });

    if (winnersFinalId) {
      await tx.match.update({
        where: { id: winnersFinalId },
        data: { nextMatchId: grandFinal.id },
      });
    }
  }

  /**
   * Pure function of (numRounds, byes): how many teams arrive at each losers
   * round, and how many matches/winners it produces. Round 1 only ever
   * receives REAL round-1 losers (byes produce none); round k (even, k>1)
   * is "mixed" — it receives round (k-1)'s winners plus the next winners-
   * round's losers (winners rounds 2+ never have byes, so that count is
   * always the full 2^(numRounds-r)); round k (odd, k>1) is "consolidation"
   * — it only receives round (k-1)'s winners. `Math.ceil` at every step is
   * what makes an odd arrival count a bye instead of a stuck lone team.
   */
  private computeLosersTopology(numRounds: number, byes: number) {
    const winnersRoundMatches = (r: number) => Math.pow(2, numRounds - r);
    const losersRounds = 2 * (numRounds - 1);
    const realRound1Losers = winnersRoundMatches(1) - byes;

    const arrivals: number[] = [];
    const output: number[] = [];
    arrivals[1] = realRound1Losers;
    output[1] = Math.ceil(arrivals[1] / 2);
    for (let k = 2; k <= losersRounds; k++) {
      if (k % 2 === 0) {
        const feedingWbRound = k / 2 + 1;
        arrivals[k] = output[k - 1] + winnersRoundMatches(feedingWbRound);
      } else {
        arrivals[k] = output[k - 1];
      }
      output[k] = Math.ceil(arrivals[k] / 2);
    }
    return { losersRounds, arrivals };
  }

  /**
   * Places one team into losers-bracket `round`, creating a new match if no
   * existing one in that round still has an open slot. Once every arrival
   * expected for this round (per `computeLosersTopology`) has been placed, a
   * team left alone in a match has no opponent coming — it's walked over
   * into the next round (or straight into the grand final, if this was the
   * losers final) instead of sitting stuck forever.
   */
  private async placeInLosersBracketRound(
    bracketId: string,
    round: number,
    teamId: string,
    ctx: {
      losersRounds: number;
      arrivals: number[];
      bestOfSets: number;
      finalBestOfSets: number;
      tiebreakScore: number | null;
      grandFinalId: string;
    },
  ) {
    const isFinal = round === ctx.losersRounds;

    const incomplete = await this.prisma.match.findFirst({
      where: { bracketId, group: 1, round, teamAId: { not: null }, teamBId: null },
      orderBy: { position: 'asc' },
    });

    if (incomplete) {
      await this.prisma.match.update({ where: { id: incomplete.id }, data: { teamBId: teamId } });
    } else {
      const existingCount = await this.prisma.match.count({ where: { bracketId, group: 1, round } });
      await this.prisma.match.create({
        data: {
          bracketId,
          round,
          position: existingCount,
          group: 1,
          status: MatchStatus.SCHEDULED,
          teamAId: teamId,
          bestOfSets: isFinal ? ctx.finalBestOfSets : ctx.bestOfSets,
          ...(isFinal && ctx.tiebreakScore ? { tiebreakScore: ctx.tiebreakScore } : {}),
          ...(isFinal ? { label: 'LF', nextMatchId: ctx.grandFinalId } : {}),
        },
      });
    }

    const roundMatches = await this.prisma.match.findMany({ where: { bracketId, group: 1, round } });
    const placedCount = roundMatches.reduce((sum, m) => sum + (m.teamAId ? 1 : 0) + (m.teamBId ? 1 : 0), 0);
    if (placedCount < ctx.arrivals[round]) return;

    const lone = roundMatches.find((m) => m.teamAId && !m.teamBId);
    if (!lone || !lone.teamAId) return;

    await this.prisma.match.update({
      where: { id: lone.id },
      data: { status: MatchStatus.WALKOVER, winnerId: lone.teamAId },
    });

    if (isFinal) {
      await this.advanceTeamToNextMatch(this.prisma, ctx.grandFinalId, lone.teamAId, 'A');
    } else {
      await this.placeInLosersBracketRound(bracketId, round + 1, lone.teamAId, ctx);
    }
  }

  /**
   * Routes a finished DOUBLE_ELIMINATION match's outcome into the losers
   * bracket. Winners-bracket matches (group=0) send their LOSER in (a bye has
   * no second team, so no loser to route); losers-bracket matches (group=1)
   * send their WINNER to the next losers round — except the losers final,
   * whose winner already reaches the grand final via its own `nextMatchId`
   * (set the moment `placeInLosersBracketRound` creates that match), so
   * nothing further is needed here for it.
   */
  async advanceDoubleElimination(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, include: { bracket: true } });
    if (!match || !match.bracket) return;
    if (match.bracket.type !== BracketType.DOUBLE_ELIMINATION) return;
    if (!match.winnerId) return;
    if (match.group !== 0 && match.group !== 1) return;

    const numRoundsAgg = await this.prisma.match.aggregate({
      where: { bracketId: match.bracketId!, group: 0 },
      _max: { round: true },
    });
    const numRounds = numRoundsAgg._max.round;
    if (!numRounds) return;

    if (match.group === 0) {
      if (!match.teamAId || !match.teamBId) return; // bye — no real loser
      const loserId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
      if (!loserId) return;

      const wb1Matches = await this.prisma.match.findMany({ where: { bracketId: match.bracketId!, group: 0, round: 1 } });
      const byes = wb1Matches.filter((m) => m.teamAId && !m.teamBId).length;
      const { losersRounds, arrivals } = this.computeLosersTopology(numRounds, byes);

      const category = await this.prisma.tournamentCategory.findUnique({ where: { id: match.bracket.categoryId } });
      const bestOfSets = category?.bestOfSets ?? 1;
      const finalBestOfSets = (category as any)?.finalBestOfSets ?? bestOfSets;
      const tiebreakScore = (category as any)?.tiebreakScore ?? null;

      const grandFinal = await this.prisma.match.findFirst({ where: { bracketId: match.bracketId!, group: 2 } });
      if (!grandFinal) return;

      const destRound = match.round === 1 ? 1 : 2 * (match.round - 1);
      await this.placeInLosersBracketRound(match.bracketId!, destRound, loserId, {
        losersRounds, arrivals, bestOfSets, finalBestOfSets, tiebreakScore, grandFinalId: grandFinal.id,
      });
    } else {
      const losersRounds = 2 * (numRounds - 1);
      if (match.round === losersRounds) return; // losers final — handled by its own nextMatchId

      const wb1Matches = await this.prisma.match.findMany({ where: { bracketId: match.bracketId!, group: 0, round: 1 } });
      const byes = wb1Matches.filter((m) => m.teamAId && !m.teamBId).length;
      const { arrivals } = this.computeLosersTopology(numRounds, byes);

      const category = await this.prisma.tournamentCategory.findUnique({ where: { id: match.bracket.categoryId } });
      const bestOfSets = category?.bestOfSets ?? 1;
      const finalBestOfSets = (category as any)?.finalBestOfSets ?? bestOfSets;
      const tiebreakScore = (category as any)?.tiebreakScore ?? null;

      const grandFinal = await this.prisma.match.findFirst({ where: { bracketId: match.bracketId!, group: 2 } });
      if (!grandFinal) return;

      await this.placeInLosersBracketRound(match.bracketId!, match.round + 1, match.winnerId, {
        losersRounds, arrivals, bestOfSets, finalBestOfSets, tiebreakScore, grandFinalId: grandFinal.id,
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
    category: { id?: string; groupsCount?: number | null; teamsPerGroup?: number | null; teamsAdvancing?: number | null },
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

    // Default advancing rule: top 2 per group, always leaving at least one
    // team behind. "Grupos + Eliminatória" means there MUST be a knockout
    // phase after groups — that's the entire point of the format (as opposed
    // to plain "Todos contra Todos"). A group of exactly 2 teams already
    // decides its own winner by playing each other, so only 1 advances.
    let teamsAdvancing: number;
    if (category.teamsAdvancing) {
      teamsAdvancing = category.teamsAdvancing;
    } else if (actualTeamsPerGroup <= 2) {
      teamsAdvancing = 1;
    } else {
      teamsAdvancing = Math.min(2, actualTeamsPerGroup - 1);
    }

    // If all teams advance from each group, skip elimination phase
    const needsElimination = teamsAdvancing < actualTeamsPerGroup;

    // checkAndAdvanceGroupTeams reads teamsAdvancing straight off the category
    // row once every group match is finished — it was never persisted here
    // when only the default-rule fallback was used, so it stayed null and the
    // elimination bracket's TBD slots never got filled in.
    if (category.id && !category.teamsAdvancing) {
      await tx.tournamentCategory.update({
        where: { id: category.id },
        data: { teamsAdvancing },
      });
    }

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

    // Same bye-allocation rule as generateSingleElimination/generateDoubleElimination:
    // if totalAdvancing isn't a power of 2, the first `byes` matches get a single
    // team (auto-advance) instead of leaving trailing matches with zero teams.
    const byes = Math.max(0, firstRoundMatches.length * 2 - reordered.length);
    let teamIdx = 0;
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const elimMatch = firstRoundMatches[i];
      const updateData: any = {};
      if (!elimMatch.teamAId && teamIdx < reordered.length) {
        updateData.teamAId = reordered[teamIdx++];
      }
      if (i >= byes && !elimMatch.teamBId && teamIdx < reordered.length) {
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

  // Team profile stats ("torneios / vitórias / win rate") are computed on
  // demand from real match history instead of maintained counters — no
  // migration/backfill needed, and it's automatically correct for
  // tournaments that finished before this feature existed.
  async getTournamentChampionTeamIds(tournamentId: string): Promise<Set<string>> {
    const brackets = await this.prisma.bracket.findMany({ where: { tournamentId }, select: { id: true } });
    const championIds = new Set<string>();
    for (const b of brackets) {
      const champion = await this.getBracketChampion(b.id);
      if (champion) championIds.add(champion);
    }
    return championIds;
  }

  // A bracket's champion is whoever won its FINAL/GRAND_FINAL match. Small
  // round-robins (<4 teams) and "groups where everyone advances" never
  // create that match, so fall back to the best win/loss record instead.
  private async getBracketChampion(bracketId: string): Promise<string | null> {
    const matches = await this.prisma.match.findMany({
      where: { bracketId },
      select: {
        teamAId: true, teamBId: true, winnerId: true, status: true, label: true,
        sets: { select: { scoreA: true, scoreB: true } },
      },
    });

    const finalMatch = matches.find(
      (m) => (m.label === 'FINAL' || m.label === 'GRAND_FINAL')
        && (m.status === MatchStatus.FINISHED || m.status === MatchStatus.WALKOVER)
        && m.winnerId,
    );
    if (finalMatch) return finalMatch.winnerId;

    const decided = matches.filter(
      (m) => (m.status === MatchStatus.FINISHED || m.status === MatchStatus.WALKOVER) && m.teamAId && m.teamBId,
    );
    if (decided.length === 0) return null;

    const table = new Map<string, { wins: number; pf: number; pa: number }>();
    for (const m of decided) {
      const a = m.teamAId!, b = m.teamBId!;
      if (!table.has(a)) table.set(a, { wins: 0, pf: 0, pa: 0 });
      if (!table.has(b)) table.set(b, { wins: 0, pf: 0, pa: 0 });
      const ea = table.get(a)!, eb = table.get(b)!;
      const pf = m.sets.reduce((s, x) => s + x.scoreA, 0);
      const pa = m.sets.reduce((s, x) => s + x.scoreB, 0);
      ea.pf += pf; ea.pa += pa;
      eb.pf += pa; eb.pa += pf;
      if (m.winnerId === a) ea.wins++;
      else if (m.winnerId === b) eb.wins++;
    }
    const sorted = [...table.entries()].sort((x, y) => {
      if (y[1].wins !== x[1].wins) return y[1].wins - x[1].wins;
      return (y[1].pf - y[1].pa) - (x[1].pf - x[1].pa);
    });
    return sorted[0]?.[0] ?? null;
  }

  /**
   * Quantas datas o organizador ainda precisa informar.
   *
   * So faz sentido com o numero de partidas ja conhecido — por isso a liga nao aceita eliminacao
   * dupla, onde o total depende do resultado.
   */
  async previewSchedule(tournamentId: string, categoryId?: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, deletedAt: null },
    });
    if (!tournament) throw AppError.tournamentNotFound();
    if (!tournament.matchesPerDay) throw AppError.matchesPerDayRequired();

    const totalMatches = await this.prisma.match.count({
      where: { bracket: { tournamentId, ...(categoryId ? { categoryId } : {}) } },
    });

    return {
      totalMatches,
      matchesPerDay: tournament.matchesPerDay,
      datesNeeded: Math.ceil(totalMatches / tournament.matchesPerDay),
    };
  }

  /**
   * Distribui as partidas nas datas informadas.
   *
   * A ordem e a do chaveamento (rodada, grupo, posicao): a fase de grupos cai nos primeiros dias e
   * o mata-mata no fim, que e a unica ordem em que uma fase nao depende de outra ainda nao jogada.
   * O organizador escolhe as datas, nunca os confrontos.
   */
  async scheduleMatches(tournamentId: string, userId: string, dto: ScheduleMatchesDto) {
    const tournament = await this.tournamentsService.verifyOwnership(tournamentId, userId);
    if (!tournament.matchesPerDay) throw AppError.matchesPerDayRequired();

    const matches = await this.prisma.match.findMany({
      where: { bracket: { tournamentId, ...(dto.categoryId ? { categoryId: dto.categoryId } : {}) } },
      orderBy: [{ round: 'asc' }, { group: 'asc' }, { position: 'asc' }],
      select: { id: true },
    });

    const datesNeeded = Math.ceil(matches.length / tournament.matchesPerDay);
    if (dto.dates.length < datesNeeded) {
      this.logger.warn(
        `scheduleMatches rejected: ${dto.dates.length} datas para ${matches.length} partidas ` +
          `(precisa de ${datesNeeded})`,
      );
      throw AppError.notEnoughDates();
    }

    await this.prisma.$transaction(
      matches.map((match, i) =>
        this.prisma.match.update({
          where: { id: match.id },
          data: { scheduledAt: new Date(dto.dates[Math.floor(i / tournament.matchesPerDay!)]) },
        }),
      ),
    );

    return { scheduled: matches.length, datesUsed: datesNeeded };
  }
}
