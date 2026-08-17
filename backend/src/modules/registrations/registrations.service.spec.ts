import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../../common/prisma.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { NotificationService } from '../../common/services/notification.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../common/redis/redis.service';
import { TournamentStatus, TournamentFormat, RegistrationStatus } from '@prisma/client';

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let prisma: any;
  let tournamentsService: any;
  let notificationService: any;

  const mockTournament = {
    id: 't1',
    name: 'Torneio Teste',
    status: TournamentStatus.PUBLISHED,
    ownerId: 'owner-1',
  };

  const mockCategory = {
    id: 'cat1',
    tournamentId: 't1',
    format: TournamentFormat.PAIR,
    minMembers: 2,
    maxMembers: 2,
    registrationPrice: null,
    registrationDeadline: null,
  };

  const mockTeam = {
    id: 'team1',
    name: 'Time Teste',
    ownerId: 'user-1',
    members: [{ id: 'm1', isCaptain: true }, { id: 'm2', isCaptain: false }],
  };

  const mockRegistration = {
    id: 'reg1',
    tournamentId: 't1',
    categoryId: 'cat1',
    teamId: 'team1',
    userId: 'user-1',
    status: RegistrationStatus.PENDING_CONFIRMATION,
    tournament: { id: 't1', name: 'Torneio Teste', status: TournamentStatus.PUBLISHED },
    category: { id: 'cat1', type: 'MALE', format: 'PAIR', modality: 'BEACH' },
    team: { id: 'team1', name: 'Time Teste' },
    user: { id: 'user-1', name: 'User', email: 'user@test.com' },
    members: [],
  };

  beforeEach(async () => {
    prisma = {
      tournament: { findUnique: jest.fn() },
      tournamentCategory: { findUnique: jest.fn() },
      team: { findUnique: jest.fn() },
      registration: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      registrationMember: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    tournamentsService = { verifyOwnership: jest.fn() };
    notificationService = { sendToUsers: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TournamentsService, useValue: tournamentsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AuditService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
  });

  // Helper: faz o $transaction executar o callback com um `tx` mockado.
  const txReturns = (registration: any, alreadyRegistered: any[] = []) => {
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        registrationMember: { findMany: jest.fn().mockResolvedValue(alreadyRegistered) },
        registration: { create: jest.fn().mockResolvedValue(registration) },
      }),
    );
  };

  describe('registerTeam', () => {
    it('should register a team as PENDING_CONFIRMATION (free tournament)', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      txReturns(mockRegistration);

      const result = await service.registerTeam('t1', 'user-1', {
        teamId: 'team1',
        categoryId: 'cat1',
        memberIds: ['m1', 'm2'],
      });

      expect(result.status).toBe(RegistrationStatus.PENDING_CONFIRMATION);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should register a team as PENDING_CONFIRMATION even in a paid tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue({ ...mockCategory, registrationPrice: 150.0 });
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      txReturns({ ...mockRegistration, status: RegistrationStatus.PENDING_CONFIRMATION });

      const result = await service.registerTeam('t1', 'user-1', {
        teamId: 'team1',
        categoryId: 'cat1',
        memberIds: ['m1', 'm2'],
      });

      expect(result.status).toBe(RegistrationStatus.PENDING_CONFIRMATION);
    });

    it('should reject if tournament not open', async () => {
      prisma.tournament.findUnique.mockResolvedValue({ ...mockTournament, status: TournamentStatus.DRAFT });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if category not in tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if deadline expired', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue({
        ...mockCategory,
        registrationDeadline: new Date('2020-01-01'),
      });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if team already registered', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      txReturns(mockRegistration, [{ teamMemberId: 'm1' }]);

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject if user is not team owner', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue({ ...mockTeam, ownerId: 'other-user' });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if team size mismatch', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue({ ...mockTeam, members: [{ id: 'm1', isCaptain: true }] });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm_not_in_team'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listByTournament', () => {
    it('should list registrations for tournament owner', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(mockTournament);
      prisma.registration.findMany.mockResolvedValue([mockRegistration]);

      const result = await service.listByTournament('t1', 'owner-1', {});

      expect(result).toEqual([mockRegistration]);
    });
  });

  describe('confirmRegistration', () => {
    it('should confirm (mark as paid) a pending confirmation registration', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(mockTournament);
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.PENDING_CONFIRMATION,
      });
      prisma.registration.update.mockResolvedValue({ ...mockRegistration, status: RegistrationStatus.CONFIRMED });

      const result = await service.confirmRegistration('t1', 'reg1', 'owner-1');

      expect(result.status).toBe(RegistrationStatus.CONFIRMED);
      expect(prisma.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RegistrationStatus.CONFIRMED, paidAt: expect.any(Date) }),
        }),
      );
    });

    it('should reject if already confirmed', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(mockTournament);
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CONFIRMED,
      });

      await expect(
        service.confirmRegistration('t1', 'reg1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRegistration', () => {
    it('should reject a registration', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(mockTournament);
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.PENDING_CONFIRMATION,
      });
      prisma.registration.update.mockResolvedValue({ ...mockRegistration, status: RegistrationStatus.REJECTED });

      const result = await service.rejectRegistration('t1', 'reg1', 'owner-1');

      expect(result.status).toBe(RegistrationStatus.REJECTED);
    });

    it('should reject if already cancelled', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(mockTournament);
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CANCELLED,
      });

      await expect(
        service.rejectRegistration('t1', 'reg1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listMine', () => {
    it('should list user registrations', async () => {
      prisma.registration.findMany.mockResolvedValue([mockRegistration]);

      const result = await service.listMine('user-1');

      expect(result).toEqual([mockRegistration]);
      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return registration details', async () => {
      prisma.registration.findUnique.mockResolvedValue(mockRegistration);

      const result = await service.findOne('reg1', 'user-1');

      expect(result).toEqual(mockRegistration);
    });

    it('should reject if not owner of registration', async () => {
      prisma.registration.findUnique.mockResolvedValue(mockRegistration);

      await expect(
        service.findOne('reg1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if not found', async () => {
      prisma.registration.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('invalid', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel a registration', async () => {
      prisma.registration.findUnique.mockResolvedValue(mockRegistration);
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);
      prisma.registration.update.mockResolvedValue({ ...mockRegistration, status: RegistrationStatus.CANCELLED });

      const result = await service.cancelRegistration('reg1', 'user-1');

      expect(result.status).toBe(RegistrationStatus.CANCELLED);
    });

    it('should reject if tournament already started', async () => {
      prisma.registration.findUnique.mockResolvedValue(mockRegistration);
      prisma.tournament.findUnique.mockResolvedValue({ ...mockTournament, status: TournamentStatus.IN_PROGRESS });

      await expect(
        service.cancelRegistration('reg1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if already cancelled', async () => {
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CANCELLED,
      });

      await expect(
        service.cancelRegistration('reg1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
