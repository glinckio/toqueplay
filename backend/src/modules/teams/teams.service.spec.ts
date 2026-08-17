import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: {
    team: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      team: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('create', () => {
    it('should create a team and add owner as captain member', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Time Teste',
        ownerId: 'user-1',
        members: [{ userId: 'user-1', isCaptain: true }],
      };
      prisma.team.create.mockResolvedValue(mockTeam);

      const result = await service.create('user-1', {
        name: 'Time Teste',
      });

      expect(result).toEqual(mockTeam);
      expect(prisma.team.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Time Teste',
          ownerId: 'user-1',
          members: {
            create: { userId: 'user-1', isCaptain: true, isGuest: false },
          },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    it('should return teams where user is owner or member', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Team A', ownerId: 'user-1' },
        { id: 'team-2', name: 'Team B', ownerId: 'user-2' },
      ];
      prisma.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockTeams);
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: 'user-1' },
            { members: { some: { userId: 'user-1' } } },
          ],
        },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return team details when user is owner', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Team A',
        ownerId: 'user-1',
        members: [{ userId: 'user-1', isCaptain: true }],
      };
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      const result = await service.findOne('team-1', 'user-1');
      expect(result).toEqual(mockTeam);
    });

    it('should return team details when user is member', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Team A',
        ownerId: 'user-2',
        members: [
          { userId: 'user-2', isCaptain: true },
          { userId: 'user-1', isCaptain: false },
        ],
      };
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      const result = await service.findOne('team-1', 'user-1');
      expect(result).toEqual(mockTeam);
    });

    it('should throw TEAM_NOT_FOUND when team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(service.findOne('team-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw TEAM_NOT_FOUND when user is not owner or member', async () => {
      const mockTeam = {
        id: 'team-1',
        ownerId: 'user-2',
        members: [{ userId: 'user-2' }],
      };
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      await expect(service.findOne('team-1', 'user-3')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update team when user is owner', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        ownerId: 'user-1',
      });
      const updated = { id: 'team-1', name: 'Updated' };
      prisma.team.update.mockResolvedValue(updated);

      const result = await service.update('team-1', 'user-1', {
        name: 'Updated',
      });
      expect(result).toEqual(updated);
    });

    it('should throw NOT_TEAM_OWNER when user is not owner', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        ownerId: 'user-2',
      });

      await expect(
        service.update('team-1', 'user-1', { name: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw TEAM_NOT_FOUND when team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(
        service.update('team-x', 'user-1', { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete team when user is owner', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        ownerId: 'user-1',
      });
      prisma.team.delete.mockResolvedValue({ id: 'team-1' });

      await service.remove('team-1', 'user-1');
      expect(prisma.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-1' },
      });
    });

    it('should throw NOT_TEAM_OWNER when user is not owner', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        ownerId: 'user-2',
      });

      await expect(service.remove('team-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('verifyOwnership', () => {
    it('should return team when user is owner', async () => {
      const mockTeam = { id: 'team-1', ownerId: 'user-1' };
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      const result = await service.verifyOwnership('team-1', 'user-1');
      expect(result).toEqual(mockTeam);
    });

    it('should throw NOT_TEAM_OWNER when user is not owner', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        ownerId: 'user-2',
      });

      await expect(
        service.verifyOwnership('team-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw TEAM_NOT_FOUND when team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyOwnership('team-x', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
