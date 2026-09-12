import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { NotificationService } from '../../common/services/notification.service';
import { RedisService } from '../../common/redis/redis.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { RegisterTeamDto } from './dto/register-team.dto';
import { QueryRegistrationsDto } from './dto/query-registrations.dto';
import {
  TournamentStatus,
  RegistrationStatus,
  TournamentEventType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';

const REGISTRATION_INCLUDE = {
  tournament: { select: { id: true, name: true, status: true } },
  category: { select: { id: true, type: true, format: true, modality: true, registrationPrice: true } },
  team: { select: { id: true, name: true, avatarUrl: true } },
  user: { select: { id: true, name: true, email: true } },
  members: {
    include: {
      teamMember: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  },
};

@Injectable()
export class RegistrationsService {
  constructor(
    private prisma: PrismaService,
    private tournamentsService: TournamentsService,
    private notificationService: NotificationService,
    private auditService: AuditService,
    private redisService: RedisService,
  ) {}

  /**
   * Descobre em qual etapa a inscricao entra.
   *
   * Circuito e por etapa, entao o cliente precisa dizer qual. Torneio unico e liga tem uma etapa
   * so — exigir o id ali seria burocracia, entao o sistema resolve sozinho.
   */
  private async resolveStage(
    tournament: { id: string; eventType: TournamentEventType },
    stageId?: string,
  ) {
    if (stageId) {
      const stage = await this.prisma.tournamentStage.findFirst({
        where: { id: stageId, tournamentId: tournament.id },
      });
      if (!stage) throw AppError.stageNotFound();
      return stage;
    }

    if (tournament.eventType === TournamentEventType.CIRCUIT) {
      throw AppError.stageRequiredForCircuit();
    }

    const stages = await this.prisma.tournamentStage.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { date: 'asc' },
      take: 1,
    });
    if (stages.length === 0) throw AppError.stageNotFound();
    return stages[0];
  }

  async registerTeam(tournamentId: string, userId: string, dto: RegisterTeamDto) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, deletedAt: null },
    });
    if (!tournament) throw AppError.tournamentNotFound();

    if (
      tournament.status !== TournamentStatus.PUBLISHED &&
      tournament.status !== TournamentStatus.REGISTRATION_OPEN
    ) {
      throw AppError.tournamentNotOpen();
    }

    const stage = await this.resolveStage(tournament, dto.stageId);

    const category = await this.prisma.tournamentCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || category.tournamentId !== tournamentId) {
      throw AppError.categoryNotInTournament();
    }

    if (category.registrationDeadline && new Date() > new Date(category.registrationDeadline)) {
      throw AppError.registrationDeadlineExpired();
    }

    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
      include: { members: true },
    });
    if (!team) {
      throw AppError.teamNotFound();
    }
    if (team.ownerId !== userId) {
      throw AppError.notTeamOwner();
    }

    // Validate selected members belong to team
    const teamMemberIds = new Set(team.members.map((m) => m.id));

    for (const mid of dto.memberIds) {
      if (!teamMemberIds.has(mid)) {
        throw AppError.teamSizeMismatch();
      }
    }
    if (dto.memberIds.length < category.minMembers || dto.memberIds.length > category.maxMembers) {
      throw AppError.teamSizeMismatch();
    }

    // Race-condition-safe registration: check + create inside a single transaction.
    // Any concurrent request that wins the check will block the other until commit,
    // and the second will then see the freshly-inserted rows and throw.
    // Pagamento é manual: toda inscrição nasce como PENDING_CONFIRMATION e o
    // organizador marca quem pagou (CONFIRMED + paidAt) depois.
    const registration = await this.prisma.$transaction(async (tx) => {
      // Ate onde vale o bloqueio de atleta repetido:
      // - CIRCUIT: cada etapa e uma competicao propria, entao o atleta pode trocar de time entre
      //   etapas — mas nao jogar por dois times na MESMA etapa.
      // - LEAGUE: chave unica, atleta preso ao time pela competicao inteira.
      // - SINGLE: so existe uma etapa, entao os dois escopos coincidem.
      const escopo =
        tournament.eventType === TournamentEventType.CIRCUIT
          ? { stageId: stage.id }
          : { tournamentId };

      const alreadyRegistered = await tx.registrationMember.findMany({
        where: {
          teamMemberId: { in: dto.memberIds },
          registration: {
            ...escopo,
            status: { notIn: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED] },
          },
        },
        select: { teamMemberId: true },
      });
      if (alreadyRegistered.length > 0) {
        throw AppError.teamAlreadyRegistered();
      }

      // A checagem acima e por teamMemberId — a mesma pessoa cadastrada em dois times tem ids
      // diferentes e passaria batido. Numa liga de varias etapas isso deixaria o atleta jogar por
      // times distintos. A comparacao por CPF fecha essa brecha; o organizador pode liberar
      // ligando allowSameAthleteMultipleTeams no torneio.
      if (!tournament.allowSameAthleteMultipleTeams) {
        const membros = await tx.teamMember.findMany({
          where: { id: { in: dto.memberIds } },
          select: { cpf: true },
        });
        // Membro sem CPF cadastrado nao tem como ser cruzado — fica de fora da regra.
        const cpfs = membros
          .map((m) => m.cpf)
          .filter((cpf): cpf is string => Boolean(cpf));

        if (cpfs.length > 0) {
          const jaInscritoPorOutroTime = await tx.registrationMember.findFirst({
            where: {
              teamMember: { cpf: { in: cpfs } },
              registration: {
                ...escopo,
                teamId: { not: dto.teamId },
                status: {
                  notIn: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED],
                },
              },
            },
          });

          if (jaInscritoPorOutroTime) {
            throw AppError.athleteAlreadyInTournament();
          }
        }
      }

      return tx.registration.create({
        data: {
          tournamentId,
          stageId: stage.id,
          categoryId: dto.categoryId,
          teamId: dto.teamId,
          userId,
          status: RegistrationStatus.PENDING_CONFIRMATION,
          members: {
            create: dto.memberIds.map((teamMemberId) => ({
              teamMemberId,
              isCaptain: dto.captainMemberId ? teamMemberId === dto.captainMemberId : false,
            })),
          },
        },
        include: REGISTRATION_INCLUDE,
      });
    });

    if (tournament.ownerId !== userId) {
      await this.notificationService.sendToUsers([tournament.ownerId], {
        title: 'Nova inscrição!',
        body: `O time "${registration.team.name}" se inscreveu no torneio "${tournament.name}".`,
        type: 'REGISTRATION_CREATED',
        referenceId: tournamentId,
      });
    }

    return registration;
  }

  async listByTournament(tournamentId: string, userId: string, query: QueryRegistrationsDto) {
    await this.tournamentsService.verifyOwnership(tournamentId, userId);

    const where: any = { tournamentId };
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;

    return this.prisma.registration.findMany({
      where,
      include: REGISTRATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Organizador confirma a inscrição = marca como pago (status CONFIRMED + paidAt).
  async confirmRegistration(tournamentId: string, regId: string, userId: string) {
    const tournament = await this.tournamentsService.verifyOwnership(tournamentId, userId);

    if (tournament.status === TournamentStatus.IN_PROGRESS || tournament.status === TournamentStatus.FINISHED) {
      throw AppError.cannotModifyStarted();
    }

    const registration = await this.findRegistrationOrThrow(regId);

    if (registration.tournamentId !== tournamentId) {
      throw AppError.registrationNotFound();
    }

    if (registration.status === RegistrationStatus.CONFIRMED) {
      throw AppError.registrationAlreadyConfirmed();
    }

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: { status: RegistrationStatus.CONFIRMED, paidAt: new Date() },
      include: REGISTRATION_INCLUDE,
    });

    // Notify all registered athletes
    const memberUserIds = updated.members
      .map((m: any) => m.teamMember?.user?.id)
      .filter((id: string | null | undefined): id is string => !!id && id !== userId);
    if (memberUserIds.length > 0) {
      await this.notificationService.sendToUsers(memberUserIds, {
        title: 'Inscrição Confirmada!',
        body: `Sua inscrição no torneio "${updated.tournament.name}" foi confirmada.`,
        type: 'REGISTRATION_CONFIRMED',
        referenceId: tournamentId,
      });
    }

    return updated;
  }

  // Organizador (owner) marca manualmente quem pagou via app.
  // paid=true => CONFIRMED + paidAt (+ notifica os atletas).
  // paid=false => volta para PENDING_CONFIRMATION (ainda não pagou).
  async setRegistrationPaid(
    tournamentId: string,
    regId: string,
    userId: string,
    paid: boolean,
  ) {
    const tournament = await this.tournamentsService.verifyOwnership(tournamentId, userId);

    if (tournament.status === TournamentStatus.IN_PROGRESS || tournament.status === TournamentStatus.FINISHED) {
      throw AppError.cannotModifyStarted();
    }

    const registration = await this.findRegistrationOrThrow(regId);

    if (registration.tournamentId !== tournamentId) {
      throw AppError.registrationNotFound();
    }

    if (
      registration.status !== RegistrationStatus.PENDING_CONFIRMATION &&
      registration.status !== RegistrationStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Inscrição cancelada ou rejeitada não pode ser marcada como paga',
      );
    }

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: paid
        ? { status: RegistrationStatus.CONFIRMED, paidAt: new Date() }
        : { status: RegistrationStatus.PENDING_CONFIRMATION, paidAt: null },
      include: REGISTRATION_INCLUDE,
    });

    if (paid) {
      const memberUserIds = updated.members
        .map((m: any) => m.teamMember?.user?.id)
        .filter((id: string | null | undefined): id is string => !!id && id !== userId);
      if (memberUserIds.length > 0) {
        await this.notificationService.sendToUsers(memberUserIds, {
          title: 'Inscrição Confirmada!',
          body: `Sua inscrição no torneio "${updated.tournament.name}" foi confirmada.`,
          type: 'REGISTRATION_CONFIRMED',
          referenceId: tournamentId,
        });
      }
    }

    return updated;
  }

  async rejectRegistration(tournamentId: string, regId: string, userId: string) {
    const tournament = await this.tournamentsService.verifyOwnership(tournamentId, userId);

    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw AppError.cannotModifyStarted();
    }

    const registration = await this.findRegistrationOrThrow(regId);

    if (registration.tournamentId !== tournamentId) {
      throw AppError.registrationNotFound();
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw AppError.registrationAlreadyCancelled();
    }

    if (registration.status === RegistrationStatus.REJECTED) {
      throw AppError.registrationAlreadyConfirmed();
    }

    const wasPaid = registration.status === RegistrationStatus.CONFIRMED;

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: { status: RegistrationStatus.REJECTED },
      include: REGISTRATION_INCLUDE,
    });

    const memberUserIds = updated.members
      .map((m: any) => m.teamMember?.user?.id)
      .filter((id: string | null | undefined): id is string => !!id && id !== userId);
    if (memberUserIds.length > 0) {
      await this.notificationService.sendToUsers(memberUserIds, {
        title: 'Inscrição recusada',
        body: wasPaid
          ? `Sua inscrição no torneio "${updated.tournament.name}" foi recusada pelo organizador. Entre em contato para o reembolso.`
          : `Sua inscrição no torneio "${updated.tournament.name}" foi recusada pelo organizador.`,
        type: 'REGISTRATION_REJECTED',
        referenceId: tournamentId,
      });
    }

    return updated;
  }

  async listMine(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId },
      include: REGISTRATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRegisteredMembers(tournamentId: string, teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw AppError.teamNotFound();
    if (team.ownerId !== userId) throw AppError.notTeamOwner();

    const regs = await this.prisma.registration.findMany({
      where: {
        tournamentId,
        teamId,
        status: { notIn: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED] },
      },
      select: {
        members: { select: { teamMemberId: true } },
      },
    });
    const memberIds = regs.flatMap((r) => r.members.map((m) => m.teamMemberId));
    return { memberIds };
  }

  async findOne(regId: string, userId: string) {
    const registration = await this.findRegistrationOrThrow(regId);

    if (registration.userId !== userId) {
      throw AppError.notRegistrationOwner();
    }

    return registration;
  }

  async cancelRegistration(regId: string, userId: string) {
    const registration = await this.findRegistrationOrThrow(regId);

    if (registration.userId !== userId) {
      throw AppError.notRegistrationOwner();
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw AppError.registrationAlreadyCancelled();
    }

    const tournament = await this.prisma.tournament.findFirst({
      where: { id: registration.tournamentId, deletedAt: null },
    });

    if (
      tournament!.status === TournamentStatus.IN_PROGRESS ||
      tournament!.status === TournamentStatus.FINISHED ||
      tournament!.status === TournamentStatus.CANCELLED
    ) {
      throw AppError.cannotCancelStarted();
    }

    return this.prisma.registration.update({
      where: { id: regId },
      data: { status: RegistrationStatus.CANCELLED },
      include: REGISTRATION_INCLUDE,
    });
  }

  private async findRegistrationOrThrow(regId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: REGISTRATION_INCLUDE,
    });

    if (!registration) {
      throw AppError.registrationNotFound();
    }

    return registration;
  }
}
