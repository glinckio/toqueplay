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
import { NotificationService } from '../../common/services/notification.service';

describe('TeamMembersService', () => {
  let service: TeamMembersService;
  let prisma: any;
  let teamsService: { verifyOwnership: jest.Mock; findOne: jest.Mock };
  let notificationService: { sendToUsers: jest.Mock };

  beforeEach(async () => {
    prisma = {
      team: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      teamInvitation: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
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

    notificationService = { sendToUsers: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMembersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: TeamsService, useValue: teamsService },
        { provide: CpfService, useValue: { validate: jest.fn(), isValid: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    service = module.get<TeamMembersService>(TeamMembersService);
  });

  describe('addMember', () => {
    // addMember nao adiciona ninguem direto: cria um convite pendente e notifica o usuario.
    // Quem entra no time de fato e o accept do convite.
    it('should create a pending invitation and notify the invited user', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamInvitation.findUnique.mockResolvedValue(null);
      prisma.team.findUnique.mockResolvedValue({ name: 'Team A' });
      prisma.teamInvitation.create.mockResolvedValue({
        id: 'invite-1',
        teamId: 'team-1',
        invitedUserId: 'user-2',
      });

      const result = await service.addMember('team-1', 'owner-1', {
        email: 'user2@test.com',
        positions: [],
      });

      expect(result).toEqual({ id: 'invite-1', teamId: 'team-1', invitedUserId: 'user-2' });
      expect(prisma.teamInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: 'team-1',
            invitedUserId: 'user-2',
            invitedById: 'owner-1',
          }),
        }),
      );
      expect(prisma.teamMember.create).not.toHaveBeenCalled();
      expect(notificationService.sendToUsers).toHaveBeenCalledWith(
        ['user-2'],
        expect.objectContaining({ type: 'TEAM_INVITE', referenceId: 'invite-1' }),
      );
    });

    it('should throw when user email not found', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember('team-1', 'owner-1', {
          email: 'nobody@test.com',
          cpf: '01234567890',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when user is already a member', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addMember('team-1', 'owner-1', {
          email: 'user2@test.com',
          cpf: '01234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw when there is already a pending invitation', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamInvitation.findUnique.mockResolvedValue({ id: 'invite-1', status: 'PENDING' });

      await expect(
        service.addMember('team-1', 'owner-1', { email: 'user2@test.com' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.teamInvitation.create).not.toHaveBeenCalled();
    });

    // Convite ja respondido nao bloqueia: e apagado para dar lugar ao novo.
    it('should replace an invitation that was already answered', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamInvitation.findUnique.mockResolvedValue({ id: 'invite-old', status: 'REJECTED' });
      prisma.team.findUnique.mockResolvedValue({ name: 'Team A' });
      prisma.teamInvitation.create.mockResolvedValue({ id: 'invite-2' });

      await service.addMember('team-1', 'owner-1', { email: 'user2@test.com' });

      expect(prisma.teamInvitation.delete).toHaveBeenCalledWith({ where: { id: 'invite-old' } });
      expect(prisma.teamInvitation.create).toHaveBeenCalled();
    });

    // O dono nem sempre sabe o e-mail de cadastro do atleta; o CPF e obrigatorio e unico.
    it('should find the invitee by CPF when no email is given', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamInvitation.findUnique.mockResolvedValue(null);
      prisma.team.findUnique.mockResolvedValue({ name: 'Team A' });
      prisma.teamInvitation.create.mockResolvedValue({ id: 'invite-1' });

      await service.addMember('team-1', 'owner-1', { cpf: '01234567890' });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { cpf: '01234567890' } });
    });

    // Precedencia fixa para nao mudar o comportamento de quem ja convidava por e-mail.
    it('should prefer the email when both identities are given', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.teamMember.findUnique.mockResolvedValue(null);
      prisma.teamInvitation.findUnique.mockResolvedValue(null);
      prisma.team.findUnique.mockResolvedValue({ name: 'Team A' });
      prisma.teamInvitation.create.mockResolvedValue({ id: 'invite-1' });

      await service.addMember('team-1', 'owner-1', {
        email: 'user2@test.com',
        cpf: '01234567890',
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'user2@test.com' },
      });
    });

    it('should throw when no user matches the CPF', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember('team-1', 'owner-1', { cpf: '01234567890' }),
      ).rejects.toThrow(NotFoundException);
    });

    // O DTO ja barra payload sem identidade, mas o service nao pode depender so disso.
    it('should throw when neither email nor CPF is given', async () => {
      teamsService.verifyOwnership.mockResolvedValue({});

      await expect(service.addMember('team-1', 'owner-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
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
