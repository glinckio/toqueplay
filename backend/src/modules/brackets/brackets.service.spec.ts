import { Test, TestingModule } from '@nestjs/testing';
import { BracketsService } from './brackets.service';
import { PrismaService } from '../../common/prisma.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { TournamentStatus, BracketType, MatchStatus, RegistrationStatus, TournamentEventType } from '@prisma/client';
import { NotificationService } from '../../common/services/notification.service';

describe('BracketsService', () => {
  let service: BracketsService;
  let prisma: any;
  let tournamentsService: any;

  const mockTournament = {
    id: 't1',
    name: 'Torneio Teste',
    status: TournamentStatus.REGISTRATION_CLOSED,
    ownerId: 'user-1',
    eventType: TournamentEventType.SINGLE,
  };

  beforeEach(async () => {
    prisma = {
      tournamentCategory: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      tournamentStage: { findMany: jest.fn().mockResolvedValue([{ id: 'stage-1', date: new Date() }]) },
      bracket: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      registration: { findMany: jest.fn() },
      tournament: { update: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
      match: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    tournamentsService = {
      verifyOwnership: jest.fn().mockResolvedValue(mockTournament),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BracketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: { getRegisteredAthleteUserIds: jest.fn().mockResolvedValue([]), sendToUsers: jest.fn() } },
        { provide: TournamentsService, useValue: tournamentsService },
      ],
    }).compile();

    service = module.get<BracketsService>(BracketsService);
  });

  describe('generateBracket', () => {
    it('should reject if tournament status is not ready', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.DRAFT,
      });

      await expect(
        service.generateBracket('t1', 'user-1', {
          categoryId: 'cat-1',
          type: BracketType.SINGLE_ELIMINATION,
        }),
      ).rejects.toThrow();
    });

    it('should reject if bracket too early (stage > 2 days away)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      prisma.tournamentStage.findMany.mockResolvedValue([{ date: futureDate }]);

      await expect(
        service.generateBracket('t1', 'user-1', {
          categoryId: 'cat-1',
          type: BracketType.SINGLE_ELIMINATION,
        }),
      ).rejects.toThrow();
    });

    it('should reject if bracket already exists', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.tournamentStage.findMany.mockResolvedValue([{ date: yesterday }]);
      prisma.bracket.findUnique.mockResolvedValue({ id: 'existing-bracket' });

      await expect(
        service.generateBracket('t1', 'user-1', {
          categoryId: 'cat-1',
          type: BracketType.SINGLE_ELIMINATION,
        }),
      ).rejects.toThrow();
    });

    it('should reject if no confirmed teams', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.tournamentStage.findMany.mockResolvedValue([{ date: yesterday }]);
      prisma.bracket.findUnique.mockResolvedValue(null);
      prisma.registration.findMany.mockResolvedValue([]);

      await expect(
        service.generateBracket('t1', 'user-1', {
          categoryId: 'cat-1',
          type: BracketType.SINGLE_ELIMINATION,
        }),
      ).rejects.toThrow();
    });

    it('should generate single elimination bracket with 4 teams', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.tournamentStage.findMany.mockResolvedValue([{ date: yesterday }]);
      prisma.bracket.findUnique.mockResolvedValue(null);
      prisma.registration.findMany.mockResolvedValue([
        { teamId: 'team-1', team: { id: 'team-1', name: 'Team 1' } },
        { teamId: 'team-2', team: { id: 'team-2', name: 'Team 2' } },
        { teamId: 'team-3', team: { id: 'team-3', name: 'Team 3' } },
        { teamId: 'team-4', team: { id: 'team-4', name: 'Team 4' } },
      ]);

      prisma.bracket.create.mockResolvedValue({ id: 'bracket-1' });
      prisma.match.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `match-${data.round}-${data.position}`, ...data }),
      );
      prisma.tournament.update.mockResolvedValue({ ...mockTournament, status: TournamentStatus.BRACKET_GENERATED });
      prisma.bracket.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'bracket-1',
        matches: [],
      });

      const result = await service.generateBracket('t1', 'user-1', {
        categoryId: 'cat-1',
        type: BracketType.SINGLE_ELIMINATION,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.match.create).toHaveBeenCalled();
    });

    it('should generate round robin bracket', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.tournamentStage.findMany.mockResolvedValue([{ date: yesterday }]);
      prisma.bracket.findUnique.mockResolvedValue(null);
      prisma.registration.findMany.mockResolvedValue([
        { teamId: 'team-1', team: { id: 'team-1', name: 'Team 1' } },
        { teamId: 'team-2', team: { id: 'team-2', name: 'Team 2' } },
        { teamId: 'team-3', team: { id: 'team-3', name: 'Team 3' } },
      ]);

      prisma.bracket.create.mockResolvedValue({ id: 'bracket-1' });
      prisma.match.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `match-${data.round}-${data.position}`, ...data }),
      );
      prisma.tournament.update.mockResolvedValue({ ...mockTournament, status: TournamentStatus.BRACKET_GENERATED });
      prisma.bracket.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'bracket-1',
        matches: [],
      });

      const result = await service.generateBracket('t1', 'user-1', {
        categoryId: 'cat-1',
        type: BracketType.ROUND_ROBIN,
      });

      // Round robin with 3 teams = 3 matches (1v2, 1v3, 2v3)
      expect(prisma.match.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('getBracket', () => {
    it('should return brackets with rounds grouped', async () => {
      prisma.bracket.findMany.mockResolvedValue([
        {
          id: 'b1',
          matches: [
            { round: 1, position: 0 },
            { round: 1, position: 1 },
            { round: 2, position: 0 },
          ],
        },
      ]);

      const result = await service.getBracket('t1');

      expect(result[0].rounds).toEqual({
        1: [{ round: 1, position: 0 }, { round: 1, position: 1 }],
        2: [{ round: 2, position: 0 }],
      });
    });

    it('should throw if categoryId provided but not found', async () => {
      prisma.bracket.findMany.mockResolvedValue([]);

      await expect(
        service.getBracket('t1', 'non-existent'),
      ).rejects.toThrow();
    });
  });
  describe('scheduleMatches', () => {
    const partidas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `m${i}` }));

    beforeEach(() => {
      tournamentsService.verifyOwnership.mockResolvedValue({ ...mockTournament, matchesPerDay: 4 });
      prisma.$transaction.mockImplementation(async (ops: any) => ops);
    });

    it('exige que o organizador tenha definido jogos por dia', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue({ ...mockTournament, matchesPerDay: null });

      await expect(
        service.scheduleMatches('t1', 'user-1', { dates: ['2026-10-01'] }),
      ).rejects.toThrow();
    });

    // 30 partidas a 4 por dia sao 8 datas: informar 3 tem que falhar, nao agendar pela metade.
    it('recusa quando faltam datas', async () => {
      prisma.match.findMany.mockResolvedValue(partidas(30));

      await expect(
        service.scheduleMatches('t1', 'user-1', {
          dates: ['2026-10-01', '2026-10-08', '2026-10-15'],
        }),
      ).rejects.toThrow();
      expect(prisma.match.update).not.toHaveBeenCalled();
    });

    it('distribui as partidas respeitando o limite diario', async () => {
      prisma.match.findMany.mockResolvedValue(partidas(6));

      const res = await service.scheduleMatches('t1', 'user-1', {
        dates: ['2026-10-01', '2026-10-08'],
      });

      expect(res).toEqual({ scheduled: 6, datesUsed: 2 });
      // As 4 primeiras no dia 1, as 2 restantes no dia 2.
      const datas = prisma.match.update.mock.calls.map((c: any) => c[0].data.scheduledAt.toISOString());
      expect(datas.filter((d: string) => d.startsWith('2026-10-01'))).toHaveLength(4);
      expect(datas.filter((d: string) => d.startsWith('2026-10-08'))).toHaveLength(2);
    });

    // A ordem importa: grupos primeiro, mata-mata depois — uma fase nao pode cair antes da que
    // a alimenta.
    it('segue a ordem do chaveamento', async () => {
      prisma.match.findMany.mockResolvedValue(partidas(2));
      await service.scheduleMatches('t1', 'user-1', { dates: ['2026-10-01'] });

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ round: 'asc' }, { group: 'asc' }, { position: 'asc' }],
        }),
      );
    });
  });

  describe('generateBracket — formato permitido', () => {
    it('recusa eliminacao dupla numa liga', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue({
        ...mockTournament,
        eventType: TournamentEventType.LEAGUE,
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.tournamentStage.findMany.mockResolvedValue([{ id: 'stage-1', date: yesterday }]);

      await expect(
        service.generateBracket('t1', 'user-1', {
          categoryId: 'cat-1',
          type: BracketType.DOUBLE_ELIMINATION,
        }),
      ).rejects.toThrow();
    });

    it('aceita eliminacao dupla num torneio unico', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.tournamentStage.findMany.mockResolvedValue([{ id: 'stage-1', date: yesterday }]);
      prisma.bracket.findUnique.mockResolvedValue(null);
      prisma.registration.findMany.mockResolvedValue([]);

      // Passa da checagem de formato e so entao esbarra na falta de times confirmados.
      await expect(
        service.generateBracket('t1', 'user-1', {
          categoryId: 'cat-1',
          type: BracketType.DOUBLE_ELIMINATION,
        }),
      ).rejects.toThrow();
      expect(prisma.registration.findMany).toHaveBeenCalled();
    });
  });
});
