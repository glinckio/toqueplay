import { Test, TestingModule } from '@nestjs/testing';
import { BracketsService } from './brackets.service';
import { PrismaService } from '../../common/prisma.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { TournamentStatus, BracketType, MatchStatus, RegistrationStatus } from '@prisma/client';

describe('BracketsService', () => {
  let service: BracketsService;
  let prisma: any;
  let tournamentsService: any;

  const mockTournament = {
    id: 't1',
    name: 'Torneio Teste',
    status: TournamentStatus.REGISTRATION_CLOSED,
    ownerId: 'user-1',
  };

  beforeEach(async () => {
    prisma = {
      tournamentStage: { findMany: jest.fn() },
      bracket: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      registration: { findMany: jest.fn() },
      tournament: { update: jest.fn() },
      match: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    tournamentsService = {
      verifyOwnership: jest.fn().mockResolvedValue(mockTournament),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BracketsService,
        { provide: PrismaService, useValue: prisma },
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
      prisma.match.create.mockImplementation(({ data }) =>
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
      prisma.match.create.mockImplementation(({ data }) =>
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
});
