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
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';

const REGISTRATION_INCLUDE = {
  tournament: { select: { id: true, name: true, status: true } },
  category: { select: { id: true, type: true, format: true, modality: true, registrationPrice: true } },
  team: { select: { id: true, name: true } },
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

  async registerTeam(tournamentId: string, userId: string, dto: RegisterTeamDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) throw AppError.tournamentNotFound();

    if (
      tournament.status !== TournamentStatus.PUBLISHED &&
      tournament.status !== TournamentStatus.REGISTRATION_OPEN
    ) {
      throw AppError.tournamentNotOpen();
    }

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
      const alreadyRegistered = await tx.registrationMember.findMany({
        where: {
          teamMemberId: { in: dto.memberIds },
          registration: {
            tournamentId,
            status: { notIn: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED] },
          },
        },
        select: { teamMemberId: true },
      });
      if (alreadyRegistered.length > 0) {
        throw AppError.teamAlreadyRegistered();
      }

      return tx.registration.create({
        data: {
          tournamentId,
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

    if (tournament.status === TournamentStatus.IN_PROGRESS || tournament.status === TournamentStatus.FINISHED) {
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

    return this.prisma.registration.update({
      where: { id: regId },
      data: { status: RegistrationStatus.REJECTED },
      include: REGISTRATION_INCLUDE,
    });
  }

  async listMine(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId },
      include: REGISTRATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRegisteredMembers(tournamentId: string, teamId: string) {
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

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: registration.tournamentId },
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
