import { Test, TestingModule } from '@nestjs/testing';
import { RankingService } from './ranking.service';
import { PrismaService } from '../../common/prisma.service';
import { MatchStatus } from '@prisma/client';

describe('RankingService', () => {
  let service: RankingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tournament: { findUnique: jest.fn() },
      bracket: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
  });

  describe('getRanking', () => {
    it('should throw if tournament not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);

      await expect(service.getRanking('non-existent')).rejects.toThrow();
    });

    it('should return ranking sorted by points', async () => {
      prisma.tournament.findUnique.mockResolvedValue({ id: 't1', stages: [] });

      prisma.bracket.findMany.mockResolvedValue([
        {
          id: 'b1',
          category: { id: 'cat-1', type: 'MALE', format: 'PAIR', modality: 'BEACH' },
          matches: [
            // Final
            {
              round: 2,
              position: 0,
              teamAId: 'team-1',
              teamBId: 'team-2',
              winnerId: 'team-1',
              winner: { id: 'team-1', name: 'Team 1', avatarUrl: null },
            },
            // Semi 1
            {
              round: 1,
              position: 0,
              teamAId: 'team-1',
              teamBId: 'team-3',
              winnerId: 'team-1',
              winner: { id: 'team-1', name: 'Team 1', avatarUrl: null },
            },
            // Semi 2
            {
              round: 1,
              position: 1,
              teamAId: 'team-2',
              teamBId: 'team-4',
              winnerId: 'team-2',
              winner: { id: 'team-2', name: 'Team 2', avatarUrl: null },
            },
          ],
        },
      ]);

      const result = await service.getRanking('t1');

      expect(result.ranking).toBeInstanceOf(Array);
      expect(result.ranking[0].position).toBe(1);
      expect(result.ranking[0].team.id).toBe('team-1');
      expect(result.ranking[0].points).toBe(100); // 1st place
    });

    it('should return empty ranking when no brackets', async () => {
      prisma.tournament.findUnique.mockResolvedValue({ id: 't1', stages: [] });
      prisma.bracket.findMany.mockResolvedValue([]);

      const result = await service.getRanking('t1');

      expect(result.ranking).toEqual([]);
    });
  });
});
