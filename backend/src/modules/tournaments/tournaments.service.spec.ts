import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../../common/prisma.service';
import { TournamentStatus, TournamentEventType, TournamentType, TournamentFormat, TournamentModality } from '@prisma/client';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let prisma: any;

  const mockTournament = {
    id: 't1',
    name: 'Torneio Teste',
    eventType: TournamentEventType.SINGLE,
    status: TournamentStatus.DRAFT,
    isPublished: false,
    ownerId: 'user-1',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: { id: 'user-1', name: 'Owner', email: 'owner@test.com', avatarUrl: null },
    categories: [],
    stages: [],
    sponsors: [],
  };

  beforeEach(async () => {
    prisma = {
      tournament: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tournamentStage: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      tournamentCategory: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      stageFacility: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      sponsor: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
  });

  describe('create', () => {
    it('should create a tournament with DRAFT status', async () => {
      prisma.tournament.create.mockResolvedValue(mockTournament);

      const result = await service.create('user-1', {
        name: 'Torneio Teste',
      });

      expect(result).toEqual(mockTournament);
      expect(prisma.tournament.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Torneio Teste',
          ownerId: 'user-1',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('updateStructure', () => {
    it('should update structure with stages and categories', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.stageFacility.deleteMany.mockResolvedValue({ count: 0 });
      prisma.tournamentStage.deleteMany.mockResolvedValue({ count: 0 });
      prisma.tournamentCategory.deleteMany.mockResolvedValue({ count: 0 });
      prisma.tournament.update.mockResolvedValue({
        ...mockTournament,
        eventType: TournamentEventType.CIRCUIT,
        stages: [{ id: 's1', name: 'Etapa 1', date: new Date() }],
        categories: [{ id: 'c1', type: TournamentType.MALE, format: TournamentFormat.PAIR, modality: TournamentModality.BEACH }],
      });

      const result = await service.updateStructure('t1', 'user-1', {
        eventType: TournamentEventType.CIRCUIT,
        stages: [{ date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], name: 'Etapa 1' }],
        categories: [{ type: TournamentType.MALE, format: TournamentFormat.PAIR, modality: TournamentModality.BEACH }],
      });

      expect(result.eventType).toBe(TournamentEventType.CIRCUIT);
    });

    it('should reject CIRCUIT without stages', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);

      await expect(
        service.updateStructure('t1', 'user-1', {
          eventType: TournamentEventType.CIRCUIT,
          stages: [],
        }),
      ).rejects.toThrow();
    });

    it('should reject non-DRAFT tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.PUBLISHED,
      });

      await expect(
        service.updateStructure('t1', 'user-1', {
          eventType: TournamentEventType.SINGLE,
        }),
      ).rejects.toThrow();
    });
  });

  describe('addStageFacilities', () => {
    it('should add facilities to a stage', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentStage.findFirst.mockResolvedValue({ id: 's1', tournamentId: 't1' });
      prisma.stageFacility.createMany.mockResolvedValue({ count: 2 });
      prisma.tournamentStage.findUnique.mockResolvedValue({
        id: 's1',
        facilities: [{ name: 'Estacionamento' }, { name: 'Churrasqueira' }],
      });

      const result = await service.addStageFacilities('t1', 's1', 'user-1', [
        { name: 'Estacionamento' },
        { name: 'Churrasqueira' },
      ]);

      expect(prisma.stageFacility.createMany).toHaveBeenCalled();
    });

    it('should throw if stage not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentStage.findFirst.mockResolvedValue(null);

      await expect(
        service.addStageFacilities('t1', 'invalid-stage', 'user-1', [{ name: 'Estacionamento' }]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeStageFacility', () => {
    it('should remove a facility from a stage', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.stageFacility.findFirst.mockResolvedValue({ id: 'f1', stageId: 's1' });
      prisma.stageFacility.delete.mockResolvedValue({ id: 'f1' });

      await service.removeStageFacility('t1', 's1', 'f1', 'user-1');

      expect(prisma.stageFacility.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
    });

    it('should throw if facility not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.stageFacility.findFirst.mockResolvedValue(null);

      await expect(
        service.removeStageFacility('t1', 's1', 'f1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addSponsors', () => {
    it('should add sponsors in batch', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.sponsor.createMany.mockResolvedValue({ count: 1 });
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament).mockResolvedValueOnce({
        ...mockTournament,
        sponsors: [{ name: 'Patrocinador 1' }],
      });

      await service.addSponsors('t1', 'user-1', {
        sponsors: [{ name: 'Patrocinador 1' }],
      });

      expect(prisma.sponsor.createMany).toHaveBeenCalled();
    });
  });

  describe('removeSponsor', () => {
    it('should throw if sponsor not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.sponsor.findFirst.mockResolvedValue(null);

      await expect(
        service.removeSponsor('t1', 'sp1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish a valid tournament', async () => {
      const ready = {
        ...mockTournament,
        city: 'Sao Paulo',
        stages: [{
          id: 's1',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          city: 'Sao Paulo',
          street: 'Rua Teste',
        }],
        categories: [{ id: 'c1', type: TournamentType.MALE, format: TournamentFormat.PAIR, modality: TournamentModality.BEACH }],
      };
      prisma.tournament.findUnique
        .mockResolvedValueOnce(mockTournament)
        .mockResolvedValueOnce(ready);
      prisma.tournament.update.mockResolvedValue({
        ...ready,
        status: TournamentStatus.PUBLISHED,
        isPublished: true,
      });

      const result = await service.publish('t1', 'user-1');

      expect(result.status).toBe(TournamentStatus.PUBLISHED);
      expect(result.isPublished).toBe(true);
    });

    it('should reject publish when missing required fields', async () => {
      const incomplete = {
        ...mockTournament,
        city: null,
        address: null,
        stages: [],
        categories: [],
      };
      prisma.tournament.findUnique
        .mockResolvedValueOnce(mockTournament)
        .mockResolvedValueOnce(incomplete);

      await expect(
        service.publish('t1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject publish when already published', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.PUBLISHED,
      });

      await expect(
        service.publish('t1', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should list tournaments with filters', async () => {
      prisma.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.findAll({ city: 'Sao Paulo' });

      expect(result).toEqual([mockTournament]);
      expect(prisma.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stages: expect.objectContaining({
              some: expect.objectContaining({ city: { equals: 'Sao Paulo', mode: 'insensitive' } }),
            }),
          }),
        }),
      );
    });
  });

  describe('findMine', () => {
    it('should list user tournaments', async () => {
      prisma.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.findMine('user-1');

      expect(prisma.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: 'user-1' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return tournament details', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);

      const result = await service.findOne('t1');

      expect(result).toEqual(mockTournament);
    });

    it('should throw if not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a DRAFT tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournament.update.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.CANCELLED,
      });

      const result = await service.cancel('t1', 'user-1');

      expect(result.status).toBe(TournamentStatus.CANCELLED);
    });

    it('should reject cancel when IN_PROGRESS', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.IN_PROGRESS,
      });

      await expect(
        service.cancel('t1', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('verifyOwnership', () => {
    it('should throw if tournament not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getSummary('invalid', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not owner', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        ...mockTournament,
        ownerId: 'other-user',
      });

      await expect(
        service.getSummary('t1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
