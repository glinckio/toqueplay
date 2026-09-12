import { Test, TestingModule } from '@nestjs/testing';
import { MatchesService } from './matches.service';
import { PrismaService } from '../../common/prisma.service';
import { MatchesGateway } from './matches.gateway';
import { ForbiddenException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { RankingService } from '../ranking/ranking.service';
import { BracketsService } from '../brackets/brackets.service';
import { StandingsService } from '../standings/standings.service';
import { NotificationService } from '../../common/services/notification.service';

describe('MatchesService', () => {
  let service: MatchesService;
  let prisma: any;
  let gateway: any;

  const mockBracket = {
    id: 'bracket-1',
    tournamentId: 't1',
    category: { id: 'cat-1', type: 'MALE', format: 'PAIR' },
  };

  const createMockMatch = (overrides: any = {}) => ({
    id: 'match-1',
    bracketId: 'bracket-1',
    round: 1,
    position: 0,
    status: MatchStatus.SCHEDULED,
    teamAId: 'team-1',
    teamBId: 'team-2',
    scoreTeamA: 0,
    scoreTeamB: 0,
    nextMatchId: null,
    // scoreTeamA/scoreTeamB contam sets, não pontos: com bestOfSets o finishMatch valida por
    // sets ganhos (2 de 3). Sem esse campo ele cai na validação legada, por pontuação total.
    bestOfSets: 3,
    winnerId: null,
    startedAt: null,
    finishedAt: null,
    bracket: mockBracket,
    ...overrides,
  });

  const mockTournament = {
    id: 't1',
    ownerId: 'user-1',
  };

  beforeEach(async () => {
    prisma = {
      bracket: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      friendlyAthlete: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      matchEvent: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      matchLineupSlot: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      registration: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      team: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      teamMember: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      tournamentReferee: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      match: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matchSet: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      pointEvent: { create: jest.fn() },
      tournament: { findUnique: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    gateway = {
      emitToTournament: jest.fn(),
      emitToFriendly: jest.fn(),
      emitToMatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: { getRegisteredAthleteUserIds: jest.fn().mockResolvedValue([]), getTeamMemberUserIds: jest.fn().mockResolvedValue([]), sendToUsers: jest.fn() } },
        // Resolvido, não undefined: o service encadeia `.catch()` nessas chamadas.
        { provide: BracketsService, useValue: { advanceDoubleElimination: jest.fn().mockResolvedValue(undefined), checkAndAdvanceGroupTeams: jest.fn().mockResolvedValue(undefined), checkAndAdvanceRoundRobinTeams: jest.fn().mockResolvedValue(undefined) } },
        { provide: RankingService, useValue: { updateStatsAfterMatch: jest.fn() } },
        { provide: StandingsService, useValue: { computeStagePlacements: jest.fn().mockResolvedValue([]) } },
        { provide: MatchesGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  // Numa partida de torneio quem apita é o árbitro confirmado, não o dono do torneio
  // (ver findMatchWithReferee). Por isso o mock precisa do tournamentReferee, não só do tournament.
  const setupMatchAsReferee = (matchOverrides: any = {}) => {
    prisma.match.findUnique.mockResolvedValue(createMockMatch(matchOverrides));
    prisma.tournament.findFirst.mockResolvedValue(mockTournament);
    prisma.tournamentReferee.findUnique.mockResolvedValue({
      tournamentId: 't1',
      userId: 'user-1',
      codeConfirmed: true,
    });
  };

  describe('startMatch', () => {
    it('should start a scheduled match', async () => {
      setupMatchAsReferee();

      const startedMatch = {
        ...createMockMatch({ status: MatchStatus.IN_PROGRESS }),
        teamA: { id: 'team-1', name: 'Team A' },
        teamB: { id: 'team-2', name: 'Team B' },
      };
      prisma.matchSet.create.mockResolvedValue({ id: 'set-1' });
      prisma.match.update.mockResolvedValue(startedMatch);

      const result = await service.startMatch('match-1', 'user-1');

      expect(result.status).toBe(MatchStatus.IN_PROGRESS);
      expect(gateway.emitToTournament).toHaveBeenCalledWith('t1', 'match:start', expect.any(Object));
    });

    it('should reject if match already started', async () => {
      setupMatchAsReferee({ status: MatchStatus.IN_PROGRESS });

      await expect(
        service.startMatch('match-1', 'user-1'),
      ).rejects.toThrow();
    });

    it('should reject if missing opponent', async () => {
      setupMatchAsReferee({ teamBId: null });

      await expect(
        service.startMatch('match-1', 'user-1'),
      ).rejects.toThrow();
    });

    it('should reject the tournament owner when they are not a referee', async () => {
      setupMatchAsReferee();
      prisma.tournamentReferee.findUnique.mockResolvedValue(null);

      await expect(service.startMatch('match-1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.match.update).not.toHaveBeenCalled();
    });

    it('should reject a referee that has not confirmed the code', async () => {
      setupMatchAsReferee();
      prisma.tournamentReferee.findUnique.mockResolvedValue({
        tournamentId: 't1',
        userId: 'user-1',
        codeConfirmed: false,
      });

      await expect(service.startMatch('match-1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.match.update).not.toHaveBeenCalled();
    });
  });

  describe('registerPoint', () => {
    it('should register a point for team A', async () => {
      setupMatchAsReferee({ status: MatchStatus.IN_PROGRESS, scoreTeamA: 0, scoreTeamB: 0 });
      prisma.matchSet.findFirst.mockResolvedValue({ id: 'set-1', setNumber: 1, scoreA: 0, scoreB: 0 });
      prisma.match.update.mockResolvedValue({});
      prisma.matchSet.update.mockResolvedValue({});
      prisma.pointEvent.create.mockResolvedValue({});
      // Second findUnique call for returning updated match
      prisma.match.findUnique.mockResolvedValue(createMockMatch({
        status: MatchStatus.IN_PROGRESS,
        scoreTeamA: 1,
        scoreTeamB: 0,
        teamA: { id: 'team-1', name: 'Team A' },
        teamB: { id: 'team-2', name: 'Team B' },
        sets: [],
      }));

      const result = await service.registerPoint('match-1', 'user-1', { team: 'A' });

      expect(gateway.emitToTournament).toHaveBeenCalledWith('t1', 'match:point', expect.objectContaining({ team: 'A' }));
    });

    it('should reject if match not in progress', async () => {
      setupMatchAsReferee({ status: MatchStatus.SCHEDULED });

      await expect(
        service.registerPoint('match-1', 'user-1', { team: 'A' }),
      ).rejects.toThrow();
    });
  });

  describe('finishSet', () => {
    it('should finish a set and create next set', async () => {
      setupMatchAsReferee({ status: MatchStatus.IN_PROGRESS });
      prisma.matchSet.findUnique
        .mockResolvedValueOnce({ id: 'set-1', setNumber: 1, scoreA: 21, scoreB: 18 });
      prisma.matchSet.findUnique.mockResolvedValueOnce(null); // next set doesn't exist
      // countSetsWon lê os sets do banco: 1 a 0 para o time A, então a partida ainda não acabou
      // (best of 3 precisa de 2) e o próximo set deve ser criado.
      prisma.matchSet.findMany.mockResolvedValue([{ setNumber: 1, scoreA: 21, scoreB: 18 }]);
      prisma.matchSet.create.mockResolvedValue({ id: 'set-2', setNumber: 2 });
      prisma.match.findUnique.mockResolvedValue(createMockMatch({
        status: MatchStatus.IN_PROGRESS,
        sets: [{ setNumber: 1 }, { setNumber: 2 }],
      }));

      const result = await service.finishSet('match-1', 'user-1', { setNumber: 1 });

      expect(prisma.matchSet.create).toHaveBeenCalledWith({
        data: { matchId: 'match-1', setNumber: 2 },
      });
      expect(gateway.emitToTournament).toHaveBeenCalledWith('t1', 'match:set-finish', expect.any(Object));
    });

    it('should reject if set not found', async () => {
      setupMatchAsReferee({ status: MatchStatus.IN_PROGRESS });
      prisma.matchSet.findUnique.mockResolvedValue(null);

      await expect(
        service.finishSet('match-1', 'user-1', { setNumber: 5 }),
      ).rejects.toThrow();
    });
  });

  describe('finishMatch', () => {
    it('should finish match and determine winner', async () => {
      setupMatchAsReferee({
        status: MatchStatus.IN_PROGRESS,
        scoreTeamA: 2,
        scoreTeamB: 1,
        teamAId: 'team-1',
        nextMatchId: null,
      });

      const finishedMatch = {
        id: 'match-1',
        status: MatchStatus.FINISHED,
        winnerId: 'team-1',
        teamA: { id: 'team-1', name: 'Team A' },
        teamB: { id: 'team-2', name: 'Team B' },
        winner: { id: 'team-1', name: 'Team A' },
      };
      prisma.match.update.mockResolvedValue(finishedMatch);

      const result = await service.finishMatch('match-1', 'user-1');

      expect(result.winnerId).toBe('team-1');
      expect(gateway.emitToTournament).toHaveBeenCalledWith('t1', 'match:finish', expect.any(Object));
    });

    it('should advance winner to next match', async () => {
      // First call: findMatchWithOwnership
      prisma.match.findUnique.mockResolvedValueOnce(createMockMatch({
        status: MatchStatus.IN_PROGRESS,
        scoreTeamA: 2,
        scoreTeamB: 0,
        teamAId: 'team-1',
        nextMatchId: 'next-match-1',
      }));
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.tournamentReferee.findUnique.mockResolvedValue({
        tournamentId: 't1',
        userId: 'user-1',
        codeConfirmed: true,
      });

      prisma.match.update.mockResolvedValue({
        id: 'match-1',
        status: MatchStatus.FINISHED,
        winnerId: 'team-1',
        teamA: { id: 'team-1', name: 'Team A' },
        teamB: { id: 'team-2', name: 'Team B' },
        winner: { id: 'team-1', name: 'Team A' },
      });

      // advanceWinner: findUnique for next match
      const nextMatch = { id: 'next-match-1', teamAId: null, teamBId: null };
      prisma.match.findUnique.mockResolvedValueOnce(nextMatch);

      await service.finishMatch('match-1', 'user-1');

      // advanceWinner updates next match
      expect(prisma.match.update).toHaveBeenCalled();
    });

    it('should reject if match not in progress', async () => {
      setupMatchAsReferee({ status: MatchStatus.SCHEDULED });

      await expect(
        service.finishMatch('match-1', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('declareWalkover', () => {
    it('should declare walkover for team A', async () => {
      setupMatchAsReferee({ status: MatchStatus.SCHEDULED });

      prisma.match.update.mockResolvedValue({
        id: 'match-1',
        status: MatchStatus.WALKOVER,
        winnerId: 'team-1',
        teamA: { id: 'team-1', name: 'Team A' },
        teamB: { id: 'team-2', name: 'Team B' },
        winner: { id: 'team-1', name: 'Team A' },
      });

      const result = await service.declareWalkover('match-1', 'user-1', { winnerTeam: 'A' });

      expect(result.winnerId).toBe('team-1');
      expect(result.status).toBe(MatchStatus.WALKOVER);
      expect(gateway.emitToTournament).toHaveBeenCalledWith('t1', 'match:finish', expect.objectContaining({ walkover: true }));
    });

    it('should reject if match not scheduled', async () => {
      setupMatchAsReferee({ status: MatchStatus.IN_PROGRESS });

      await expect(
        service.declareWalkover('match-1', 'user-1', { winnerTeam: 'A' }),
      ).rejects.toThrow();
    });
  });

  describe('findMatchWithOwnership', () => {
    it('should throw if match not found', async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(
        service.startMatch('non-existent', 'user-1'),
      ).rejects.toThrow();
    });

    it('should throw if user is not tournament owner', async () => {
      prisma.match.findUnique.mockResolvedValue(createMockMatch());
      prisma.tournament.findFirst.mockResolvedValue({ id: 't1', ownerId: 'other-user' });

      await expect(
        service.startMatch('match-1', 'user-1'),
      ).rejects.toThrow();
    });
  });
});
