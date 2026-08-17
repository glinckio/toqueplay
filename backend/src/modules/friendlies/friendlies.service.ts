import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { parseDate } from '../../common/utils/date';
import { NotificationService } from '../../common/services/notification.service';
import { CreateFriendlyDto } from './dto/create-friendly.dto';
import { QueryFriendlyDto, NearbyQueryDto } from './dto/query-friendly.dto';
import { FriendlyStatus } from '@prisma/client';

const FRIENDLY_INCLUDE = {
  requester: { select: { id: true, name: true, avatarUrl: true } },
  requesterTeam: { select: { id: true, name: true, avatarUrl: true } },
  challenged: { select: { id: true, name: true, avatarUrl: true } },
  challengedTeam: { select: { id: true, name: true, avatarUrl: true } },
  match: {
    include: {
      sets: { orderBy: { setNumber: 'asc' as const } },
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
      pointEvents: { orderBy: { timestamp: 'asc' as const } },
    },
  },
  athletes: {
    include: {
      teamMember: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  },
};

const CATEGORY_FORMAT_ATHLETE_COUNT: Record<string, number> = {
  PAIR: 2,
  QUARTET: 4,
  SEXTET: 6,
};

@Injectable()
export class FriendliesService {
  private chatService: any; // injected lazily to avoid circular dep

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  setChatService(chatService: any) {
    this.chatService = chatService;
  }

  async create(userId: string, dto: CreateFriendlyDto) {
    // Verify requesterTeam belongs to user if provided
    if (dto.requesterTeamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.requesterTeamId },
      });
      if (!team || team.ownerId !== userId) {
        throw AppError.notTeamOwner();
      }
    }

    // Verify challengedTeam exists if provided and auto-resolve challengedId
    let resolvedChallengedId = dto.challengedId;
    if (dto.challengedTeamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.challengedTeamId },
      });
      if (!team) {
        throw AppError.teamNotFound();
      }
      if (!resolvedChallengedId) {
        resolvedChallengedId = team.ownerId;
      }
    }

    // Auto-resolve captain to team owner if not provided
    let resolvedCaptainId = dto.captainId;
    if (!resolvedCaptainId && dto.athleteIds && dto.athleteIds.length > 0 && dto.requesterTeamId) {
      const requesterTeam = await this.prisma.team.findUnique({
        where: { id: dto.requesterTeamId },
        select: { ownerId: true },
      });
      if (requesterTeam) {
        const ownerMember = await this.prisma.teamMember.findFirst({
          where: { teamId: dto.requesterTeamId, userId: requesterTeam.ownerId },
          select: { id: true },
        });
        if (ownerMember && dto.athleteIds.includes(ownerMember.id)) {
          resolvedCaptainId = ownerMember.id;
        }
      }
    }

    // Validate athleteIds if provided
    if (dto.athleteIds && dto.athleteIds.length > 0) {
      if (!dto.requesterTeamId) {
        throw AppError.notTeamOwner();
      }

      // Validate athlete count matches categoryFormat
      if (dto.categoryFormat) {
        const expectedCount = CATEGORY_FORMAT_ATHLETE_COUNT[dto.categoryFormat];
        if (expectedCount !== undefined && dto.athleteIds.length !== expectedCount) {
          throw AppError.invalidAthleteCount();
        }
      }

      // Validate each athleteId is a TeamMember of the requesterTeam
      const members = await this.prisma.teamMember.findMany({
        where: {
          id: { in: dto.athleteIds },
          teamId: dto.requesterTeamId,
        },
        select: { id: true },
      });

      const memberIds = new Set(members.map((m) => m.id));
      for (const athleteId of dto.athleteIds) {
        if (!memberIds.has(athleteId)) {
          throw AppError.athleteNotInTeam();
        }
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const friendly = await tx.friendly.create({
        data: {
          requesterId: userId,
          requesterTeamId: dto.requesterTeamId,
          challengedId: resolvedChallengedId,
          challengedTeamId: dto.challengedTeamId,
          title: dto.title,
          description: dto.description,
          date: parseDate(dto.date) ?? new Date(),
          startTime: dto.startTime ? parseDate(dto.startTime) ?? undefined : undefined,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          latitude: dto.latitude,
          longitude: dto.longitude,
          regionRadius: dto.regionRadius,
          modality: dto.modality,
          categoryFormat: dto.categoryFormat,
        },
        include: FRIENDLY_INCLUDE,
      });

      // Create FriendlyAthlete records for requester side
      if (dto.athleteIds && dto.athleteIds.length > 0) {
        await tx.friendlyAthlete.createMany({
          data: dto.athleteIds.map((teamMemberId) => ({
            friendlyId: friendly.id,
            teamMemberId,
            side: 'REQUESTER',
            isCaptain: resolvedCaptainId === teamMemberId,
          })),
        });
      }

      return tx.friendly.findUnique({
        where: { id: friendly.id },
        include: FRIENDLY_INCLUDE,
      });
    });

    // Notify challenged user
    if (resolvedChallengedId) {
      const requesterName = result?.requester?.name ?? 'Alguém';
      const requesterTeamName = result?.requesterTeam?.name;
      const body = requesterTeamName
        ? `${requesterName} do time ${requesterTeamName} solicitou um amistoso contra o seu time!`
        : `${requesterName} solicitou um amistoso contra o seu time!`;

      await this.notificationService.createNotification(
        resolvedChallengedId,
        'Nova Solicitação de Amistoso',
        body,
        'FRIENDLY_REQUEST',
        result!.id,
      );

      // Also notify other challenged team members
      if (dto.challengedTeamId) {
        const teamUserIds = await this.notificationService.getTeamMemberUserIds(dto.challengedTeamId);
        const otherMembers = teamUserIds.filter((id) => id !== resolvedChallengedId && id !== userId);
        if (otherMembers.length > 0) {
          await this.notificationService.sendToUsers(otherMembers, {
            title: 'Nova Solicitação de Amistoso',
            body: `Seu time recebeu uma solicitação de amistoso de ${requesterTeamName ?? 'outro time'}!`,
            type: 'FRIENDLY_REQUEST',
            referenceId: result!.id,
          });
        }
      }
    }

    // Auto-create inter-team chat if both teams present
    if (this.chatService && dto.requesterTeamId && dto.challengedTeamId) {
      await this.chatService.createInterTeamChat(dto.requesterTeamId, dto.challengedTeamId);
    }

    return result;
  }

  async accept(friendlyId: string, userId: string, dto: { athleteIds: string[]; captainId?: string }) {
    const friendly = await this.findFriendlyOrThrow(friendlyId);

    if (friendly.requesterId === userId) {
      throw AppError.cannotAcceptOwnFriendly();
    }

    // Only the challenged team owner can accept
    if (!friendly.challengedTeamId) {
      throw AppError.notChallengedTeamOwner();
    }
    const isChallengedTeamOwner = await this.isTeamOwner(friendly.challengedTeamId, userId);
    if (!isChallengedTeamOwner) {
      throw AppError.notChallengedTeamOwner();
    }

    if (friendly.status !== FriendlyStatus.PENDING) {
      throw AppError.friendlyAlreadyResponded();
    }

    // Validate athlete count matches categoryFormat
    if (friendly.categoryFormat) {
      const expectedCount = CATEGORY_FORMAT_ATHLETE_COUNT[friendly.categoryFormat];
      if (expectedCount !== undefined && dto.athleteIds.length !== expectedCount) {
        throw AppError.invalidAthleteCount();
      }
    }

    // Auto-resolve captain to challenged team owner if not provided
    let resolvedAcceptCaptainId = dto.captainId;
    if (!resolvedAcceptCaptainId && friendly.challengedTeamId) {
      const challengedTeam = await this.prisma.team.findUnique({
        where: { id: friendly.challengedTeamId },
        select: { ownerId: true },
      });
      if (challengedTeam) {
        const ownerMember = await this.prisma.teamMember.findFirst({
          where: { teamId: friendly.challengedTeamId, userId: challengedTeam.ownerId },
          select: { id: true },
        });
        if (ownerMember && dto.athleteIds.includes(ownerMember.id)) {
          resolvedAcceptCaptainId = ownerMember.id;
        }
      }
    }

    // Validate athletes belong to challenged team
    if (friendly.challengedTeamId) {
      const members = await this.prisma.teamMember.findMany({
        where: { id: { in: dto.athleteIds }, teamId: friendly.challengedTeamId },
        select: { id: true },
      });
      const memberIds = new Set(members.map((m) => m.id));
      for (const aid of dto.athleteIds) {
        if (!memberIds.has(aid)) throw AppError.athleteNotInTeam();
      }
    }

    const accepted = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.friendly.update({
        where: { id: friendlyId },
        data: { status: FriendlyStatus.ACCEPTED },
        include: FRIENDLY_INCLUDE,
      });

      // Create FriendlyAthlete records for challenged side
      if (dto.athleteIds.length > 0) {
        await tx.friendlyAthlete.createMany({
          data: dto.athleteIds.map((teamMemberId) => ({
            friendlyId,
            teamMemberId,
            side: 'CHALLENGED',
            isCaptain: resolvedAcceptCaptainId === teamMemberId,
          })),
        });
      }

      // Create Match record for this friendly
      const match = await tx.match.create({
        data: {
          friendlyId: updated.id,
          round: 0,
          position: 0,
          status: 'SCHEDULED',
          teamAId: updated.requesterTeamId,
          teamBId: updated.challengedTeamId,
        },
      });

      await tx.friendly.update({
        where: { id: updated.id },
        data: { matchId: match.id },
      });

      return tx.friendly.findUnique({
        where: { id: friendlyId },
        include: FRIENDLY_INCLUDE,
      });
    });

    // Notify requester about acceptance
    const challengedTeamName = accepted?.challengedTeam?.name;
    const acceptBody = challengedTeamName
      ? `O time ${challengedTeamName} aceitou sua solicitação de amistoso!`
      : 'Sua solicitação de amistoso foi aceita!';

    await this.notificationService.createNotification(
      friendly.requesterId,
      'Amistoso Aceito!',
      acceptBody,
      'FRIENDLY_ACCEPTED',
      friendlyId,
    );

    // Notify all athletes on both sides (except requester and acceptor)
    const athleteUserIds = (accepted?.athletes ?? [])
      .map((a: any) => a.teamMember?.user?.id)
      .filter((id: string | null | undefined): id is string => !!id && id !== friendly.requesterId && id !== userId);
    if (athleteUserIds.length > 0) {
      await this.notificationService.sendToUsers([...new Set(athleteUserIds)], {
        title: 'Amistoso Aceito!',
        body: `O amistoso ${accepted?.requesterTeam?.name ?? ''} vs ${challengedTeamName ?? ''} foi confirmado!`,
        type: 'FRIENDLY_ACCEPTED',
        referenceId: friendlyId,
      });
    }

    // Auto-create inter-team chat if both teams present
    if (this.chatService && accepted?.requesterTeamId && accepted?.challengedTeamId) {
      await this.chatService.createInterTeamChat(accepted.requesterTeamId, accepted.challengedTeamId);
    }

    return accepted;
  }

  async reject(friendlyId: string, userId: string) {
    const friendly = await this.findFriendlyOrThrow(friendlyId);

    // Only the challenged team owner can reject
    if (!friendly.challengedTeamId || !(await this.isTeamOwner(friendly.challengedTeamId, userId))) {
      throw AppError.notChallengedTeamOwner();
    }

    if (friendly.status !== FriendlyStatus.PENDING) {
      throw AppError.friendlyAlreadyResponded();
    }

    const rejected = await this.prisma.friendly.update({
      where: { id: friendlyId },
      data: { status: FriendlyStatus.REJECTED },
      include: FRIENDLY_INCLUDE,
    });

    // Notify requester
    const requesterTeamName = rejected.requesterTeam?.name;
    await this.notificationService.sendToUsers([friendly.requesterId], {
      title: 'Amistoso Recusado',
      body: requesterTeamName
        ? `O time adversário recusou a solicitação de amistoso do seu time ${requesterTeamName}.`
        : 'Sua solicitação de amistoso foi recusada.',
      type: 'FRIENDLY_REJECTED',
      referenceId: friendlyId,
    });

    // Notify requester team members
    if (rejected.requesterTeamId) {
      const teamUserIds = await this.notificationService.getTeamMemberUserIds(rejected.requesterTeamId);
      const otherMembers = teamUserIds.filter((id) => id !== friendly.requesterId);
      if (otherMembers.length > 0) {
        await this.notificationService.sendToUsers(otherMembers, {
          title: 'Amistoso Recusado',
          body: `A solicitação de amistoso do seu time foi recusada.`,
          type: 'FRIENDLY_REJECTED',
          referenceId: friendlyId,
        });
      }
    }

    return rejected;
  }

  async cancel(friendlyId: string, userId: string) {
    const friendly = await this.findFriendlyOrThrow(friendlyId);

    if (friendly.requesterId !== userId) {
      throw AppError.notFriendlyRequester();
    }

    if (friendly.status === FriendlyStatus.CANCELLED) {
      throw AppError.friendlyAlreadyCancelled();
    }

    if (friendly.status !== FriendlyStatus.PENDING && friendly.status !== FriendlyStatus.ACCEPTED) {
      throw AppError.friendlyAlreadyResponded();
    }

    return this.prisma.friendly.update({
      where: { id: friendlyId },
      data: { status: FriendlyStatus.CANCELLED },
      include: FRIENDLY_INCLUDE,
    });
  }

  async selectAthletes(friendlyId: string, userId: string, athleteIds: string[]) {
    const friendly = await this.findFriendlyOrThrow(friendlyId);

    if (friendly.status !== FriendlyStatus.ACCEPTED) {
      throw AppError.friendlyNotAccepted();
    }

    // Verify user is owner of challenged team
    if (!friendly.challengedTeamId) {
      throw AppError.notChallengedTeamOwner();
    }

    const isOwner = await this.isTeamOwner(friendly.challengedTeamId, userId);
    if (!isOwner) {
      throw AppError.notChallengedTeamOwner();
    }

    // Validate athlete count matches categoryFormat
    if (friendly.categoryFormat) {
      const expectedCount = CATEGORY_FORMAT_ATHLETE_COUNT[friendly.categoryFormat];
      if (expectedCount !== undefined && athleteIds.length !== expectedCount) {
        throw AppError.invalidAthleteCount();
      }
    }

    // Validate each athleteId is a TeamMember of challengedTeam
    const members = await this.prisma.teamMember.findMany({
      where: {
        id: { in: athleteIds },
        teamId: friendly.challengedTeamId,
      },
      select: { id: true },
    });

    const memberIds = new Set(members.map((m) => m.id));
    for (const athleteId of athleteIds) {
      if (!memberIds.has(athleteId)) {
        throw AppError.athleteNotInTeam();
      }
    }

    // Replace challenged-side athletes in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.friendlyAthlete.deleteMany({
        where: {
          friendlyId,
          side: 'CHALLENGED',
        },
      });

      if (athleteIds.length > 0) {
        await tx.friendlyAthlete.createMany({
          data: athleteIds.map((teamMemberId) => ({
            friendlyId,
            teamMemberId,
            side: 'CHALLENGED',
          })),
        });
      }
    });

    return this.prisma.friendly.findUnique({
      where: { id: friendlyId },
      include: FRIENDLY_INCLUDE,
    });
  }

  async generateRefereeCode(friendlyId: string, userId: string) {
    const friendly = await this.findFriendlyOrThrow(friendlyId);

    // Verify user is a designated captain of either side in this friendly
    const captains = await this.prisma.friendlyAthlete.findMany({
      where: { friendlyId, isCaptain: true },
    });
    const captainMemberIds = captains.map((a) => a.teamMemberId);

    const isCaptain = captainMemberIds.length > 0
      ? !!(await this.prisma.teamMember.findFirst({
          where: { id: { in: captainMemberIds }, userId },
        }))
      : false; // no captains set — nobody can generate

    if (!isCaptain) {
      throw AppError.notFriendlyParticipant();
    }

    // Already generated — return existing code
    if (friendly.refereeCode) {
      return { code: friendly.refereeCode };
    }

    // Generate 6-char alphanumeric code (uppercase)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.friendly.update({
      where: { id: friendlyId },
      data: {
        refereeCode: code,
        refereeCodeExpiresAt: expiresAt,
      },
    });

    return { code };
  }

  async enterRefereeCode(userId: string, code: string) {
    const friendly = await this.prisma.friendly.findFirst({
      where: {
        refereeCode: code,
        refereeCodeExpiresAt: { gt: new Date() },
      },
      include: FRIENDLY_INCLUDE,
    });

    if (!friendly) {
      throw AppError.invalidRefereeCode();
    }

    // Find or create the associated match
    let match = await this.prisma.match.findUnique({
      where: { friendlyId: friendly.id },
    });

    if (!match) {
      // Match wasn't created yet (friendly accepted before this feature)
      match = await this.prisma.match.create({
        data: {
          friendlyId: friendly.id,
          round: 0,
          position: 0,
          status: 'SCHEDULED',
          teamAId: friendly.requesterTeamId,
          teamBId: friendly.challengedTeamId,
        },
      });

      await this.prisma.friendly.update({
        where: { id: friendly.id },
        data: { matchId: match.id },
      });
    }

    // Update match referee
    await this.prisma.match.update({
      where: { id: match.id },
      data: { refereeId: userId },
    });

    // Re-fetch with full include
    const updatedFriendly = await this.prisma.friendly.findUnique({
      where: { id: friendly.id },
      include: FRIENDLY_INCLUDE,
    });

    const updatedMatch = await this.prisma.match.findUnique({
      where: { id: match.id },
      include: {
        sets: { orderBy: { setNumber: 'asc' as const } },
        teamA: { select: { id: true, name: true } },
        teamB: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
      },
    });

    return { friendly: updatedFriendly, match: updatedMatch };
  }

  async findMine(userId: string, query: QueryFriendlyDto) {
    // Find friendlies where user is requester, challenged, or selected athlete
    const userMemberIds = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { id: true },
    });
    const memberIds = userMemberIds.map((m) => m.id);

    const athleteFriendlies = await this.prisma.friendlyAthlete.findMany({
      where: { teamMemberId: { in: memberIds } },
      select: { friendlyId: true },
    });
    const friendlyIds = [...new Set(athleteFriendlies.map((a) => a.friendlyId))];

    const where: any = {
      OR: [
        { requesterId: userId },
        { challengedId: userId },
        { id: { in: friendlyIds } },
      ],
    };

    if (query.status) where.OR.forEach((cond: any) => { cond.status = query.status; });
    if (query.city) where.OR.forEach((cond: any) => { cond.city = query.city; });

    if (query.status || query.city) {
      const baseConditions: any = { OR: [
        { requesterId: userId },
        { challengedId: userId },
        { id: { in: friendlyIds } },
      ] };
      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.city) filters.city = { equals: query.city, mode: 'insensitive' as const };

      if (query.dateFrom || query.dateTo) {
        filters.date = {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        };
      }

      return this.prisma.friendly.findMany({
        where: { AND: [baseConditions, filters] },
        include: FRIENDLY_INCLUDE,
        orderBy: { date: 'asc' },
      });
    }

    return this.prisma.friendly.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { challengedId: userId },
          { id: { in: friendlyIds } },
        ],
      },
      include: FRIENDLY_INCLUDE,
      orderBy: { date: 'asc' },
    });
  }

  async findNearby(query: NearbyQueryDto) {
    const { latitude, longitude, radius = 50 } = query;

    if (!latitude || !longitude) {
      return [];
    }

    // Bounding box approximation for filtering
    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos((latitude * Math.PI) / 180);
    const latDelta = radius / kmPerDegreeLat;
    const lngDelta = radius / kmPerDegreeLng;

    return this.prisma.friendly.findMany({
      where: {
        status: { in: [FriendlyStatus.PENDING, FriendlyStatus.ACCEPTED] },
        latitude: { not: null },
        longitude: { not: null },
        AND: [
          { latitude: { gte: latitude - latDelta } },
          { latitude: { lte: latitude + latDelta } },
          { longitude: { gte: longitude - lngDelta } },
          { longitude: { lte: longitude + lngDelta } },
        ],
      },
      include: FRIENDLY_INCLUDE,
      orderBy: { date: 'asc' },
    });
  }

  async findOne(friendlyId: string, userId: string) {
    const friendly = await this.findFriendlyOrThrow(friendlyId);

    const isRequester = friendly.requesterId === userId;
    const isChallenged = friendly.challengedId === userId;

    // Check if user is a selected athlete
    const userMemberIds = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { id: true },
    });
    const isAthlete = await this.prisma.friendlyAthlete.findFirst({
      where: { friendlyId, teamMemberId: { in: userMemberIds.map((m) => m.id) } },
    });

    if (!isRequester && !isChallenged && !isAthlete) {
      throw AppError.friendlyNotFound();
    }

    return friendly;
  }

  async explore(query: NearbyQueryDto & { dateFrom?: string; dateTo?: string; city?: string }) {
    const where: any = {
      status: { in: [FriendlyStatus.PENDING, FriendlyStatus.ACCEPTED] },
      latitude: { not: null },
      longitude: { not: null },
    };

    if (query.city) {
      where.city = { equals: query.city, mode: 'insensitive' as const };
    }

    if (query.dateFrom || query.dateTo) {
      where.date = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    if (query.latitude && query.longitude) {
      const radius = query.radius || 50;
      const kmPerDegreeLat = 111;
      const kmPerDegreeLng = 111 * Math.cos((query.latitude * Math.PI) / 180);
      const latDelta = radius / kmPerDegreeLat;
      const lngDelta = radius / kmPerDegreeLng;

      where.AND = [
        { latitude: { gte: query.latitude - latDelta } },
        { latitude: { lte: query.latitude + latDelta } },
        { longitude: { gte: query.longitude - lngDelta } },
        { longitude: { lte: query.longitude + lngDelta } },
      ];
    }

    return this.prisma.friendly.findMany({
      where,
      include: FRIENDLY_INCLUDE,
      orderBy: { date: 'asc' },
      take: 20,
    });
  }

  private async findFriendlyOrThrow(friendlyId: string) {
    const friendly = await this.prisma.friendly.findUnique({
      where: { id: friendlyId },
      include: FRIENDLY_INCLUDE,
    });

    if (!friendly) {
      throw AppError.friendlyNotFound();
    }

    return friendly;
  }

  private async isTeamOwner(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    return team?.ownerId === userId;
  }
}
