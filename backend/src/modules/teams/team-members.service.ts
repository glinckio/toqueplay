import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CpfService } from '../../common/services/cpf.service';
import { NotificationService } from '../../common/services/notification.service';
import { TeamsService } from './teams.service';
import { AppError } from '../../common/errors/app-error';
import { AddMemberDto } from './dto/add-member.dto';
import { AddGuestDto } from './dto/add-guest.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class TeamMembersService {
  constructor(
    private prisma: PrismaService,
    private teamsService: TeamsService,
    private cpfService: CpfService,
    private notificationService: NotificationService,
  ) {}

  async addMember(teamId: string, ownerId: string, dto: AddMemberDto) {
    await this.teamsService.verifyOwnership(teamId, ownerId);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw AppError.userNotFoundByEmail();
    }

    const existingMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });
    if (existingMember) {
      throw AppError.memberAlreadyInTeam();
    }

    const existingInvitation = await this.prisma.teamInvitation.findUnique({
      where: { teamId_invitedUserId: { teamId, invitedUserId: user.id } },
    });
    if (existingInvitation && existingInvitation.status === 'PENDING') {
      throw AppError.invitationAlreadyPending();
    }
    if (existingInvitation) {
      await this.prisma.teamInvitation.delete({
        where: { id: existingInvitation.id },
      });
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });

    const invitation = await this.prisma.teamInvitation.create({
      data: {
        teamId,
        invitedUserId: user.id,
        invitedById: ownerId,
        positions: dto.positions ?? [],
      },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true } },
        invitedUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await this.notificationService.sendToUsers([user.id], {
      title: 'Convite para time',
      body: `Você foi convidado para o time "${team?.name}"`,
      type: 'TEAM_INVITE',
      referenceId: invitation.id,
    });

    return invitation;
  }

  async findPendingInvitations(userId: string) {
    return this.prisma.teamInvitation.findMany({
      where: { invitedUserId: userId, status: 'PENDING' },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            owner: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw AppError.invitationNotFound();
    }
    if (invitation.invitedUserId !== userId) {
      throw AppError.notInvitedUser();
    }
    if (invitation.status !== 'PENDING') {
      throw AppError.invitationAlreadyResponded();
    }

    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: invitation.teamId, userId },
      },
    });
    if (existingMember) {
      throw AppError.userAlreadyTeamMember();
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED' },
        include: {
          team: { select: { id: true, name: true, avatarUrl: true } },
          invitedUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          isCaptain: false,
          positions: invitation.positions,
        },
      });

      return updatedInvitation;
    });
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw AppError.invitationNotFound();
    }
    if (invitation.invitedUserId !== userId) {
      throw AppError.notInvitedUser();
    }
    if (invitation.status !== 'PENDING') {
      throw AppError.invitationAlreadyResponded();
    }

    return this.prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: 'REJECTED' },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true } },
        invitedUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async addGuest(teamId: string, ownerId: string, dto: AddGuestDto) {
    await this.teamsService.verifyOwnership(teamId, ownerId);

    if (dto.cpf) {
      this.cpfService.validate(dto.cpf);
      await this.checkCpfUnique(teamId, dto.cpf);
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        isGuest: true,
        guestName: dto.guestName,
        userId: null,
        positions: dto.positions ?? [],
        ...(dto.cpf && { cpf: dto.cpf }),
      },
    });
  }

  async findAll(teamId: string, userId: string) {
    await this.teamsService.findOne(teamId, userId);

    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: [{ isCaptain: 'desc' }, { id: 'asc' }],
    });
  }

  async update(
    teamId: string,
    memberId: string,
    ownerId: string,
    dto: UpdateMemberDto,
  ) {
    await this.teamsService.verifyOwnership(teamId, ownerId);

    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member) {
      throw AppError.memberNotFound();
    }

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(dto.isCaptain !== undefined && { isCaptain: dto.isCaptain }),
        ...(dto.positions !== undefined && { positions: dto.positions }),
        ...(dto.guestName !== undefined && { guestName: dto.guestName }),
        ...(dto.jerseyNumber !== undefined && { jerseyNumber: dto.jerseyNumber }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
      },
    });
  }

  async remove(teamId: string, memberId: string, ownerId: string) {
    await this.teamsService.verifyOwnership(teamId, ownerId);

    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member) {
      throw AppError.memberNotFound();
    }

    if (member.userId === ownerId) {
      throw AppError.cannotRemoveOwner();
    }

    await this.prisma.teamMember.delete({ where: { id: memberId } });
  }

  private async checkCpfUnique(teamId: string, cpf: string) {
    const existing = await this.prisma.teamMember.findFirst({
      where: { teamId, cpf },
    });
    if (existing) {
      throw AppError.cpfAlreadyInTeam();
    }
  }
}
