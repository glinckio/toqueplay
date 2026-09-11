import { Test, TestingModule } from '@nestjs/testing';
import { FriendliesService } from './friendlies.service';
import { PrismaService } from '../../common/prisma.service';
import { FriendlyStatus } from '@prisma/client';
import { NotificationService } from '../../common/services/notification.service';

describe('FriendliesService', () => {
  let service: FriendliesService;
  let prisma: any;

  const mockFriendly = {
    id: 'f1',
    requesterId: 'user-1',
    requesterTeamId: null,
    challengedId: 'user-2',
    challengedTeamId: null,
    status: FriendlyStatus.PENDING,
    date: new Date(),
    requester: { id: 'user-1', name: 'User 1', avatarUrl: null },
    requesterTeam: null,
    challenged: { id: 'user-2', name: 'User 2', avatarUrl: null },
    challengedTeam: null,
  };

  // Aceitar e recusar exigem que o desafiado tenha um time e que o usuario seja dono dele
  // (ver accept/reject: notChallengedTeamOwner). O mockFriendly puro e usuario-contra-usuario.
  const mockTeamFriendly = {
    ...mockFriendly,
    challengedTeamId: 'team-2',
    challengedTeam: { id: 'team-2', name: 'Team 2', ownerId: 'user-2' },
  };

  beforeEach(async () => {
    prisma = {
      teamMember: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      friendly: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      team: {
        findUnique: jest.fn(),
      },
      match: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      friendlyAthlete: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((fn) => fn({
        friendly: {
          create: prisma.friendly.create,
          findUnique: prisma.friendly.findUnique,
          update: prisma.friendly.update,
        },
        match: {
          create: prisma.match.create,
          findUnique: prisma.match.findUnique,
          update: prisma.match.update,
        },
        friendlyAthlete: {
          createMany: prisma.friendlyAthlete.createMany,
          deleteMany: prisma.friendlyAthlete.deleteMany,
        },
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendliesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: { createNotification: jest.fn(), getTeamMemberUserIds: jest.fn().mockResolvedValue([]), sendToUsers: jest.fn() } },
      ],
    }).compile();

    service = module.get<FriendliesService>(FriendliesService);
  });

  describe('create', () => {
    it('should create a friendly between users', async () => {
      prisma.friendly.create.mockResolvedValue(mockFriendly);
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      const result = await service.create('user-1', {
        challengedId: 'user-2',
        date: '2026-06-01',
      });

      expect(result).toEqual(mockFriendly);
    });

    it('should create a friendly between teams', async () => {
      const teamFriendly = {
        ...mockFriendly,
        requesterTeamId: 'team-1',
        challengedTeamId: 'team-2',
      };
      prisma.team.findUnique
        .mockResolvedValueOnce({ id: 'team-1', ownerId: 'user-1' })
        .mockResolvedValueOnce({ id: 'team-2', ownerId: 'user-2' });
      prisma.friendly.create.mockResolvedValue(teamFriendly);
      prisma.friendly.findUnique.mockResolvedValue(teamFriendly);

      const result = await service.create('user-1', {
        requesterTeamId: 'team-1',
        challengedTeamId: 'team-2',
        date: '2026-06-01',
      });

      expect(result!.requesterTeamId).toBe('team-1');
    });

    it('should reject without challenged target', async () => {
      await expect(
        service.create('user-1', { date: '2026-06-01' }),
      ).rejects.toThrow();
    });

    it('should reject if requesterTeam not owned by user', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'other-user' });

      await expect(
        service.create('user-1', {
          requesterTeamId: 'team-1',
          challengedId: 'user-2',
          date: '2026-06-01',
        }),
      ).rejects.toThrow();
    });
  });

  describe('accept', () => {
    it('should accept a friendly as challenged', async () => {
      const acceptedFriendly = {
        ...mockTeamFriendly,
        status: FriendlyStatus.ACCEPTED,
      };
      // A 1a leitura e a do amistoso pendente; a 2a acontece no fim da transacao e e o que
      // o accept devolve, ja com o status atualizado.
      prisma.friendly.findUnique
        .mockResolvedValueOnce(mockTeamFriendly)
        .mockResolvedValue(acceptedFriendly);
      prisma.team.findUnique.mockResolvedValue({ id: 'team-2', ownerId: 'user-2' });
      // Os atletas escalados precisam ser membros do time desafiado.
      prisma.teamMember.findMany.mockResolvedValue([{ id: 'tm-1' }]);
      prisma.friendly.update.mockResolvedValue(acceptedFriendly);
      prisma.match.create.mockResolvedValue({ id: 'match-1', friendlyId: 'f1' });

      const result = await service.accept('f1', 'user-2', { athleteIds: ['tm-1'] });

      expect(result!.status).toBe(FriendlyStatus.ACCEPTED);
    });

    it('should reject if requester tries to accept own friendly', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      await expect(
        service.accept('f1', 'user-1', { athleteIds: ['tm-1'] }),
      ).rejects.toThrow();
    });

    it('should reject if third party tries to accept', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      await expect(
        service.accept('f1', 'user-3', { athleteIds: ['tm-1'] }),
      ).rejects.toThrow();
    });

    it('should reject if already responded', async () => {
      prisma.friendly.findUnique.mockResolvedValue({
        ...mockFriendly,
        status: FriendlyStatus.ACCEPTED,
      });

      await expect(
        service.accept('f1', 'user-2', { athleteIds: ['tm-1'] }),
      ).rejects.toThrow();
    });
  });

  describe('reject', () => {
    it('should reject a friendly as challenged', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockTeamFriendly);
      prisma.team.findUnique.mockResolvedValue({ id: 'team-2', ownerId: 'user-2' });
      prisma.friendly.update.mockResolvedValue({
        ...mockTeamFriendly,
        status: FriendlyStatus.REJECTED,
      });

      const result = await service.reject('f1', 'user-2');

      expect(result.status).toBe(FriendlyStatus.REJECTED);
    });

    it('should reject if not challenged', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      await expect(
        service.reject('f1', 'user-3'),
      ).rejects.toThrow();
    });
  });

  describe('cancel', () => {
    it('should cancel a friendly as requester', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);
      prisma.friendly.update.mockResolvedValue({
        ...mockFriendly,
        status: FriendlyStatus.CANCELLED,
      });

      const result = await service.cancel('f1', 'user-1');

      expect(result.status).toBe(FriendlyStatus.CANCELLED);
    });

    it('should reject if not requester', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      await expect(
        service.cancel('f1', 'user-2'),
      ).rejects.toThrow();
    });

    it('should reject if already cancelled', async () => {
      prisma.friendly.findUnique.mockResolvedValue({
        ...mockFriendly,
        status: FriendlyStatus.CANCELLED,
      });

      await expect(
        service.cancel('f1', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('findMine', () => {
    it('should list friendlies where user is participant', async () => {
      prisma.friendly.findMany.mockResolvedValue([mockFriendly]);

      const result = await service.findMine('user-1', {});

      expect(result).toEqual([mockFriendly]);
    });
  });

  describe('findNearby', () => {
    it('should return empty if no coords provided', async () => {
      const result = await service.findNearby({});

      expect(result).toEqual([]);
    });

    it('should search with bounding box', async () => {
      prisma.friendly.findMany.mockResolvedValue([]);

      const result = await service.findNearby({
        latitude: -23.5,
        longitude: -46.6,
        radius: 50,
      });

      expect(prisma.friendly.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [FriendlyStatus.PENDING, FriendlyStatus.ACCEPTED] },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return friendly if user is participant', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      const result = await service.findOne('f1', 'user-1');

      expect(result).toEqual(mockFriendly);
    });

    it('should reject if not participant', async () => {
      prisma.friendly.findUnique.mockResolvedValue(mockFriendly);

      await expect(
        service.findOne('f1', 'user-3'),
      ).rejects.toThrow();
    });
  });
});
