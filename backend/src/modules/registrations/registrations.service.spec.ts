import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../../common/prisma.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { NotificationService } from '../../common/services/notification.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../common/redis/redis.service';
import { TournamentStatus, TournamentFormat, RegistrationStatus, TournamentEventType } from '@prisma/client';

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
      tournament: { findUnique: jest.fn(), findFirst: jest.fn() },
      // Toda inscricao pertence a uma etapa; em torneio unico/liga o service resolve pela primeira.
      tournamentStage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage-1', tournamentId: 't1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'stage-1', tournamentId: 't1' }]),
      },
      tournamentCategory: { findUnique: jest.fn() },
      team: { findUnique: jest.fn() },
      registration: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      registrationMember: { findMany: jest.fn(), findFirst: jest.fn() },
      teamMember: { findMany: jest.fn() },
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
  // `membrosComCpf` alimenta a checagem de atleta repetido; `conflitoDeCpf` simula um CPF ja
  // inscrito por outro time no mesmo torneio.
  const txReturns = (
    registration: any,
    alreadyRegistered: any[] = [],
    membrosComCpf: any[] = [],
    conflitoDeCpf: any = null,
  ) => {
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        registrationMember: {
          findMany: jest.fn().mockResolvedValue(alreadyRegistered),
          findFirst: jest.fn().mockResolvedValue(conflitoDeCpf),
        },
        teamMember: { findMany: jest.fn().mockResolvedValue(membrosComCpf) },
        registration: { create: jest.fn().mockResolvedValue(registration) },
      }),
    );
  };

  describe('registerTeam', () => {
    it('should register a team as PENDING_CONFIRMATION (free tournament)', async () => {
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
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
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
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
      prisma.tournament.findFirst.mockResolvedValue({ ...mockTournament, status: TournamentStatus.DRAFT });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if category not in tournament', async () => {
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if deadline expired', async () => {
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue({
        ...mockCategory,
        registrationDeadline: new Date('2020-01-01'),
      });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if team already registered', async () => {
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      txReturns(mockRegistration, [{ teamMemberId: 'm1' }]);

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject if user is not team owner', async () => {
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue({ ...mockTeam, ownerId: 'other-user' });

      await expect(
        service.registerTeam('t1', 'user-1', { teamId: 'team1', categoryId: 'cat1', memberIds: ['m1', 'm2'] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if team size mismatch', async () => {
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
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

  describe('registerTeam — mesmo atleta por times diferentes', () => {
    const prepara = (torneio: any, membrosComCpf: any[], conflito: any) => {
      prisma.tournament.findFirst.mockResolvedValue(torneio);
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      txReturns(mockRegistration, [], membrosComCpf, conflito);
    };

    it('recusa quando o CPF ja esta inscrito por outro time', async () => {
      prepara(
        { ...mockTournament },
        [{ cpf: '12345678901' }, { cpf: '98765432100' }],
        { id: 'rm-existente' },
      );

      await expect(
        service.registerTeam('t1', 'user-1', { categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'] } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('permite quando o CPF ainda nao esta em nenhum outro time', async () => {
      prepara(
        { ...mockTournament },
        [{ cpf: '12345678901' }, { cpf: '98765432100' }],
        null,
      );

      await expect(
        service.registerTeam('t1', 'user-1', { categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'] } as any),
      ).resolves.toBeDefined();
    });

    it('membro sem CPF cadastrado nao e bloqueado (nao ha como cruzar)', async () => {
      prepara(
        { ...mockTournament },
        [{ cpf: null }, { cpf: null }],
        { id: 'rm-existente' },
      );

      await expect(
        service.registerTeam('t1', 'user-1', { categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'] } as any),
      ).resolves.toBeDefined();
    });
  });

  describe('rejectRegistration', () => {
    // So da para recusar enquanto as inscricoes estao abertas: o mockTournament padrao esta
    // PUBLISHED, que ja e um estado em que o chaveamento pode existir.
    const torneioComInscricoesAbertas = {
      ...mockTournament,
      status: TournamentStatus.REGISTRATION_OPEN,
    };

    it('should reject a registration', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(torneioComInscricoesAbertas);
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.PENDING_CONFIRMATION,
      });
      prisma.registration.update.mockResolvedValue({ ...mockRegistration, status: RegistrationStatus.REJECTED });

      const result = await service.rejectRegistration('t1', 'reg1', 'owner-1');

      expect(result.status).toBe(RegistrationStatus.REJECTED);
    });

    it('should reject if already cancelled', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue(torneioComInscricoesAbertas);
      prisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CANCELLED,
      });

      await expect(
        service.rejectRegistration('t1', 'reg1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject once the tournament has left REGISTRATION_OPEN', async () => {
      tournamentsService.verifyOwnership.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.IN_PROGRESS,
      });

      await expect(
        service.rejectRegistration('t1', 'reg1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.registration.update).not.toHaveBeenCalled();
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
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.registration.update.mockResolvedValue({ ...mockRegistration, status: RegistrationStatus.CANCELLED });

      const result = await service.cancelRegistration('reg1', 'user-1');

      expect(result.status).toBe(RegistrationStatus.CANCELLED);
    });

    it('should reject if tournament already started', async () => {
      prisma.registration.findUnique.mockResolvedValue(mockRegistration);
      prisma.tournament.findFirst.mockResolvedValue({ ...mockTournament, status: TournamentStatus.IN_PROGRESS });

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
  describe('registerTeam — escopo por etapa', () => {
    /** Captura o `where` das checagens feitas dentro da transacao, para inspecionar o escopo. */
    const espiaTx = (registration: any) => {
      const findMany = jest.fn().mockResolvedValue([]);
      const findFirst = jest.fn().mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          registrationMember: { findMany, findFirst },
          teamMember: { findMany: jest.fn().mockResolvedValue([{ cpf: '12345678901' }]) },
          registration: { create: jest.fn().mockResolvedValue(registration) },
        }),
      );
      return { findMany, findFirst };
    };

    const preparaBase = () => {
      prisma.tournamentCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.team.findUnique.mockResolvedValue(mockTeam);
    };

    it('exige a etapa em circuito', async () => {
      preparaBase();
      prisma.tournament.findFirst.mockResolvedValue({
        ...mockTournament,
        eventType: TournamentEventType.CIRCUIT,
      });

      await expect(
        service.registerTeam('t1', 'user-1', {
          categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    // No circuito o atleta pode trocar de time entre etapas, entao a busca por CPF repetido
    // tem que olhar so a etapa. Se olhasse o torneio inteiro, bloquearia a troca legitima.
    it('limita a checagem de CPF a etapa quando e circuito', async () => {
      preparaBase();
      prisma.tournament.findFirst.mockResolvedValue({
        ...mockTournament,
        eventType: TournamentEventType.CIRCUIT,
      });
      prisma.tournamentStage.findFirst.mockResolvedValue({ id: 'stage-2', tournamentId: 't1' });
      const { findFirst } = espiaTx(mockRegistration);

      await service.registerTeam('t1', 'user-1', {
        categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'], stageId: 'stage-2',
      } as any);

      const where = findFirst.mock.calls[0][0].where.registration;
      expect(where.stageId).toBe('stage-2');
      expect(where.tournamentId).toBeUndefined();
    });

    // Na liga a chave e unica: o atleta fica preso ao time pela competicao inteira.
    it('estende a checagem ao torneio inteiro quando e liga', async () => {
      preparaBase();
      prisma.tournament.findFirst.mockResolvedValue({
        ...mockTournament,
        eventType: TournamentEventType.LEAGUE,
      });
      const { findFirst } = espiaTx(mockRegistration);

      await service.registerTeam('t1', 'user-1', {
        categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'],
      } as any);

      const where = findFirst.mock.calls[0][0].where.registration;
      expect(where.tournamentId).toBe('t1');
      expect(where.stageId).toBeUndefined();
    });

    it('grava a inscricao na etapa resolvida', async () => {
      preparaBase();
      prisma.tournament.findFirst.mockResolvedValue(mockTournament);
      prisma.tournamentStage.findMany.mockResolvedValue([{ id: 'stage-1', tournamentId: 't1' }]);
      const criar = jest.fn().mockResolvedValue(mockRegistration);
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          registrationMember: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          teamMember: { findMany: jest.fn().mockResolvedValue([]) },
          registration: { create: criar },
        }),
      );

      await service.registerTeam('t1', 'user-1', {
        categoryId: 'cat1', teamId: 'team1', memberIds: ['m1', 'm2'],
      } as any);

      expect(criar).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stageId: 'stage-1' }) }),
      );
    });
  });
});
