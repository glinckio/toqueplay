import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TeamMembersService } from './team-members.service';
import { TeamsService } from './teams.service';
import { CpfService } from '../../common/services/cpf.service';
import { PrismaService } from '../../common/prisma.service';

describe('TeamMembersService', () => {
  let service: TeamMembersService;
  let prisma: {
    user: { findUnique: jest.Mock };
    teamMember: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let teamsService: { verifyOwnership: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      teamMember: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    teamsService = {
      verifyOwnership: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMembersService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeamsService, useValue: teamsService },
        { provide: CpfService, useValue: { validate: jest.fn(), isValid: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    service = module.get<TeamMembersService>(TeamMembersService);
  });

  describe('addMember', () => {
    it('should add a member by email with CPF', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamMember.findFirst.mockResolvedValue(null);
      prisma.teamMember.create.mockResolvedValue({
        id: 'member-1',
        teamId: 'team-1',
        userId: 'user-2',
        cpf: '01234567890',
      });

      const result = await service.addMember('team-1', 'owner-1', {
        email: 'user2@test.com',
        cpf: '01234567890',
      });

      expect(result).toEqual({ id: 'member-1', teamId: 'team-1', userId: 'user-2', cpf: '01234567890' });
      expect(prisma.teamMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: 'team-1',
            userId: 'user-2',
            cpf: '01234567890',
          }),
        }),
      );
    });

    it('should throw when user email not found', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('team-1', 'owner-1', {
          email: 'nobody@test.com',
          cpf: '01234567890',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when user is already a member', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addMember('team-1', 'owner-1', {
          email: 'user2@test.com',
          cpf: '01234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw when CPF is already in team', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamMember.findFirst.mockResolvedValue({ id: 'existing', cpf: '01234567890' });

      await expect(
        service.addMember('team-1', 'owner-1', {
          email: 'user2@test.com',
          cpf: '01234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addGuest', () => {
    it('should add a guest member with CPF', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue(null);
      prisma.teamMember.create.mockResolvedValue({
        id: 'guest-1',
        teamId: 'team-1',
        isGuest: true,
        guestName: 'Convidado',
        cpf: '02222222206',
      });

      const result = await service.addGuest('team-1', 'owner-1', {
        guestName: 'Convidado',
        cpf: '02222222206',
      });

      expect(result.isGuest).toBe(true);
      expect(result.guestName).toBe('Convidado');
      expect(result.cpf).toBe('02222222206');
    });

    it('should throw when guest CPF is already in team', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue({ id: 'existing', cpf: '02222222206' });

      await expect(
        service.addGuest('team-1', 'owner-1', {
          guestName: 'Convidado',
          cpf: '02222222206',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all members of a team', async () => {
      teamsService.findOne.mockResolvedValue({ id: 'team-1' });
      const mockMembers = [
        { id: 'm-1', userId: 'user-1', isCaptain: true, cpf: '11111111111' },
        { id: 'm-2', userId: 'user-2', isCaptain: false, cpf: '22222222222' },
      ];
      prisma.teamMember.findMany.mockResolvedValue(mockMembers);

      const result = await service.findAll('team-1', 'user-1');
      expect(result).toEqual(mockMembers);
    });
  });

  describe('update', () => {
    it('should update member isCaptain', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'm-1',
        teamId: 'team-1',
      });
      prisma.teamMember.update.mockResolvedValue({
        id: 'm-1',
        isCaptain: true,
      });

      const result = await service.update('team-1', 'm-1', 'owner-1', {
        isCaptain: true,
      });

      expect(result.isCaptain).toBe(true);
    });

    it('should throw when member not found in team', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue(null);

      await expect(
        service.update('team-1', 'm-x', 'owner-1', { isCaptain: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a member from the team', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'm-1',
        teamId: 'team-1',
        userId: 'user-2',
      });
      prisma.teamMember.delete.mockResolvedValue({ id: 'm-1' });

      await service.remove('team-1', 'm-1', 'owner-1');
      expect(prisma.teamMember.delete).toHaveBeenCalledWith({
        where: { id: 'm-1' },
      });
    });

    it('should throw when member not found', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('team-1', 'm-x', 'owner-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when trying to remove the owner', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.teamMember.findFirst.mockResolvedValue({
        id: 'm-1',
        teamId: 'team-1',
        userId: 'owner-1',
      });

      await expect(
        service.remove('team-1', 'm-1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
