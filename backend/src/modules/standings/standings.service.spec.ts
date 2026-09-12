import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BracketType, MatchStatus } from '@prisma/client';
import { StandingsService } from './standings.service';
import { PrismaService } from '../../common/prisma.service';

describe('StandingsService', () => {
  let service: StandingsService;
  let prisma: any;

  const partida = (over: any = {}) => ({
    teamAId: 'a', teamBId: 'b', winnerId: 'a',
    scoreTeamA: 2, scoreTeamB: 0, round: 1, group: null,
    status: MatchStatus.FINISHED, sets: [{ scoreA: 21, scoreB: 15 }, { scoreA: 21, scoreB: 18 }],
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      bracket: { findUnique: jest.fn() },
      tournament: { findFirst: jest.fn() },
      tournamentPointsRule: {
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { placement: 1, points: 100 },
          { placement: 2, points: 80 },
          { placement: 3, points: 60 },
        ]),
      },
      stagePlacement: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StandingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(StandingsService);
  });

  describe('computeStagePlacements', () => {
    it('recusa enquanto houver partida pendente', async () => {
      prisma.bracket.findUnique.mockResolvedValue({
        type: BracketType.SINGLE_ELIMINATION,
        category: { bestOfSets: 3 },
        stage: { tournamentId: 't1' },
        matches: [partida({ status: MatchStatus.SCHEDULED })],
      });

      await expect(service.computeStagePlacements('stage-1', 'cat-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.stagePlacement.createMany).not.toHaveBeenCalled();
    });

    // Mata-mata de 4: campeao, vice e dois empatados em 3o — nao existe 4o lugar.
    it('divide a colocacao entre quem cai na mesma fase', async () => {
      prisma.bracket.findUnique.mockResolvedValue({
        type: BracketType.SINGLE_ELIMINATION,
        category: { bestOfSets: 3 },
        stage: { tournamentId: 't1' },
        matches: [
          partida({ teamAId: 'a', teamBId: 'c', winnerId: 'a', round: 1 }),
          partida({ teamAId: 'b', teamBId: 'd', winnerId: 'b', round: 1 }),
          partida({ teamAId: 'a', teamBId: 'b', winnerId: 'a', round: 2 }),
        ],
      });

      const linhas = await service.computeStagePlacements('stage-1', 'cat-1');
      const porTime = Object.fromEntries(linhas.map((l) => [l.teamId, l]));

      expect(porTime['a'].position).toBe(1);
      expect(porTime['b'].position).toBe(2);
      expect(porTime['c'].position).toBe(3);
      expect(porTime['d'].position).toBe(3);
      expect(linhas.map((l) => l.position)).not.toContain(4);
    });

    it('converte colocacao em pontos pela tabela do torneio', async () => {
      prisma.bracket.findUnique.mockResolvedValue({
        type: BracketType.SINGLE_ELIMINATION,
        category: { bestOfSets: 3 },
        stage: { tournamentId: 't1' },
        matches: [
          partida({ teamAId: 'a', teamBId: 'c', winnerId: 'a', round: 1 }),
          partida({ teamAId: 'b', teamBId: 'd', winnerId: 'b', round: 1 }),
          partida({ teamAId: 'a', teamBId: 'b', winnerId: 'a', round: 2 }),
        ],
      });

      const linhas = await service.computeStagePlacements('stage-1', 'cat-1');
      const porTime = Object.fromEntries(linhas.map((l) => [l.teamId, l]));

      expect(porTime['a'].points).toBe(100);
      expect(porTime['b'].points).toBe(80);
      expect(porTime['c'].points).toBe(60);
      expect(porTime['d'].points).toBe(60);
    });

    // Round robin da ordem completa, entao aqui existe 3o E 4o.
    it('usa a classificacao completa no round robin', async () => {
      prisma.bracket.findUnique.mockResolvedValue({
        type: BracketType.ROUND_ROBIN,
        category: { bestOfSets: 3 },
        stage: { tournamentId: 't1' },
        matches: [
          partida({ teamAId: 'a', teamBId: 'b', winnerId: 'a', group: 0 }),
          partida({ teamAId: 'a', teamBId: 'c', winnerId: 'a', group: 0 }),
          partida({ teamAId: 'b', teamBId: 'c', winnerId: 'b', group: 0 }),
        ],
      });

      const linhas = await service.computeStagePlacements('stage-1', 'cat-1');
      expect(linhas.map((l) => l.position)).toEqual([1, 2, 3]);
      expect(linhas[0].teamId).toBe('a');
    });

    it('regrava do zero, para o recalculo ser idempotente', async () => {
      prisma.bracket.findUnique.mockResolvedValue({
        type: BracketType.SINGLE_ELIMINATION,
        category: { bestOfSets: 3 },
        stage: { tournamentId: 't1' },
        matches: [partida({ round: 1 })],
      });

      await service.computeStagePlacements('stage-1', 'cat-1');
      expect(prisma.stagePlacement.deleteMany).toHaveBeenCalledWith({
        where: { stageId: 'stage-1', categoryId: 'cat-1' },
      });
    });
  });

  describe('getTournamentStandings', () => {
    it('soma os pontos das etapas por time', async () => {
      prisma.tournament.findFirst.mockResolvedValue({
        id: 't1',
        categories: [{ id: 'cat-1', type: 'MALE', format: 'PAIR', modality: 'BEACH' }],
        stages: [{ id: 's1', name: 'Etapa 1', date: new Date() }],
      });
      prisma.stagePlacement.findMany.mockResolvedValue([
        { teamId: 'a', categoryId: 'cat-1', stageId: 's1', position: 1, points: 100, team: { id: 'a', name: 'A', avatarUrl: null } },
        { teamId: 'a', categoryId: 'cat-1', stageId: 's2', position: 2, points: 80, team: { id: 'a', name: 'A', avatarUrl: null } },
        { teamId: 'b', categoryId: 'cat-1', stageId: 's1', position: 2, points: 80, team: { id: 'b', name: 'B', avatarUrl: null } },
      ]);

      const res = await service.getTournamentStandings('t1');
      const linhas = res.categories[0].rows;

      expect(linhas[0].team.id).toBe('a');
      expect(linhas[0].total).toBe(180);
      expect(linhas[1].total).toBe(80);
    });

    // Quem entrou no circuito depois nao tem linha nas etapas anteriores — sem zero artificial.
    it('nao inventa linha para etapa nao disputada', async () => {
      prisma.tournament.findFirst.mockResolvedValue({
        id: 't1',
        categories: [{ id: 'cat-1', type: 'MALE', format: 'PAIR', modality: 'BEACH' }],
        stages: [{ id: 's1', name: 'Etapa 1', date: new Date() }],
      });
      prisma.stagePlacement.findMany.mockResolvedValue([
        { teamId: 'b', categoryId: 'cat-1', stageId: 's2', position: 1, points: 100, team: { id: 'b', name: 'B', avatarUrl: null } },
      ]);

      const linhas = (await service.getTournamentStandings('t1')).categories[0].rows;
      expect(linhas[0].byStage['s1']).toBeUndefined();
      expect(linhas[0].byStage['s2']).toEqual({ position: 1, points: 100 });
    });

    it('falha quando o torneio nao existe', async () => {
      prisma.tournament.findFirst.mockResolvedValue(null);
      await expect(service.getTournamentStandings('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('seedDefaultPointsRules', () => {
    it('nao sobrescreve uma tabela ja existente', async () => {
      prisma.tournamentPointsRule.count.mockResolvedValue(8);
      await service.seedDefaultPointsRules('t1');
      expect(prisma.tournamentPointsRule.createMany).not.toHaveBeenCalled();
    });
  });
});
