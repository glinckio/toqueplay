import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TournamentStatus, RegistrationStatus, FriendlyStatus } from '@prisma/client';

@Injectable()
export class HomeService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true },
    });

    const [
      nearbyTournaments,
      myRegistrations,
      friendliesRaw,
      acceptedFriendlies,
      unreadNotifications,
    ] = await Promise.all([
      this.getNearbyTournaments(user),
      this.getMyRegistrations(userId),
      this.getPendingFriendlies(userId),
      this.getAcceptedFriendlies(userId),
      this.getUnreadCount(userId),
    ]);

    const pendingFriendlies = friendliesRaw.map((f) => ({
      id: f.id,
      title: f.title,
      teamAName: f.requesterTeam?.name ?? f.requester?.name ?? '',
      teamBName: f.challengedTeam?.name ?? f.challenged?.name ?? '',
      date: f.date.toISOString(),
      status: f.status,
    }));

    return {
      nearbyTournaments,
      myRegistrations,
      pendingFriendlies,
      acceptedFriendlies,
      unreadNotifications,
    };
  }

  // Registrations the user actually holds, regardless of how far the tournament is —
  // these are commitments, not discovery, so distance is irrelevant here.
  private async getMyRegistrations(userId: string) {
    const registrations = await this.prisma.registration.findMany({
      where: {
        userId,
        status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_CONFIRMATION] },
      },
      select: {
        id: true,
        status: true,
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            stages: { select: { date: true, city: true, state: true }, orderBy: { date: 'asc' }, take: 1 },
          },
        },
        category: { select: { modality: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return registrations.map((r) => ({
      id: r.id,
      status: r.status,
      tournamentId: r.tournament.id,
      tournamentName: r.tournament.name,
      tournamentStatus: r.tournament.status,
      startDate: r.tournament.stages[0]?.date?.toISOString() ?? '',
      city: r.tournament.stages[0]?.city ?? '',
      modality: r.category?.modality ?? '',
    }));
  }

  // Purely proximity-based: tournaments whose stage sits within the radius of the
  // user's saved location. No exception for owned/registered tournaments — a
  // registration far away belongs in "Minhas inscrições", not here.
  private async getNearbyTournaments(
    user: { latitude: number | null; longitude: number | null } | null,
  ) {
    if (user?.latitude == null || user?.longitude == null) return [];

    const NEARBY_RADIUS_KM = 50;
    const activeStatus = { in: [TournamentStatus.PUBLISHED, TournamentStatus.REGISTRATION_OPEN, TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.BRACKET_GENERATED, TournamentStatus.IN_PROGRESS] };

    const select = {
      id: true,
      name: true,
      status: true,
      stages: { select: { date: true, street: true, number: true, neighborhood: true, city: true, state: true, latitude: true, longitude: true }, orderBy: { date: 'asc' as const } },
      categories: { select: { modality: true }, take: 1 },
      _count: { select: { registrations: true } },
    };

    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos((user.latitude * Math.PI) / 180);
    const latDelta = NEARBY_RADIUS_KM / kmPerDegreeLat;
    const lngDelta = NEARBY_RADIUS_KM / kmPerDegreeLng;

    const tournaments = await this.prisma.tournament.findMany({
      where: {
        status: activeStatus,
        stages: {
          some: {
            latitude: { gte: user.latitude - latDelta, lte: user.latitude + latDelta },
            longitude: { gte: user.longitude - lngDelta, lte: user.longitude + lngDelta },
          },
        },
      },
      select,
      take: 20,
    });

    const mapTournament = (t: any) => {
      const s = t.stages?.[0];
      const fullLocation = [s?.street, s?.number].filter(Boolean).join(', ')
        + (s?.neighborhood ? `, ${s.neighborhood}` : '')
        + (s?.city ? ` — ${s.city}` : '')
        + (s?.state ? `/${s.state}` : '');

      const distanceKm = s?.latitude != null && s?.longitude != null
        ? Math.round(this.haversineKm(user.latitude!, user.longitude!, s.latitude, s.longitude) * 10) / 10
        : null;

      return {
        id: t.id,
        name: t.name,
        status: t.status,
        startDate: s?.date?.toISOString() ?? '',
        city: s?.city ?? '',
        street: s?.street ?? '',
        number: s?.number ?? '',
        neighborhood: s?.neighborhood ?? '',
        state: s?.state ?? '',
        location: fullLocation,
        modality: t.categories?.[0]?.modality ?? '',
        registrationCount: t._count?.registrations ?? 0,
        distanceKm,
      };
    };

    return tournaments
      .map(mapTournament)
      // bounding box above is a square approximation — cut anything outside the real radius
      .filter((t) => t.distanceKm != null && t.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
      .slice(0, 5);
  }

  private async getPendingFriendlies(userId: string) {
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

    return this.prisma.friendly.findMany({
      where: {
        status: FriendlyStatus.PENDING,
        OR: [
          { challengedId: userId },
          { id: { in: friendlyIds } },
        ],
      },
      select: {
        id: true,
        title: true,
        date: true,
        status: true,
        requester: { select: { name: true } },
        requesterTeam: { select: { name: true } },
        challenged: { select: { name: true } },
        challengedTeam: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  private async getAcceptedFriendlies(userId: string) {
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

    return this.prisma.friendly.findMany({
      where: {
        status: FriendlyStatus.ACCEPTED,
        OR: [
          { requesterId: userId },
          { challengedId: userId },
          { id: { in: friendlyIds } },
        ],
      },
      include: {
        requester: { select: { id: true, name: true, avatarUrl: true } },
        requesterTeam: { select: { id: true, name: true, avatarUrl: true } },
        challenged: { select: { id: true, name: true, avatarUrl: true } },
        challengedTeam: { select: { id: true, name: true, avatarUrl: true } },
        match: {
          select: {
            id: true,
            status: true,
            scoreTeamA: true,
            scoreTeamB: true,
            teamA: { select: { id: true, name: true } },
            teamB: { select: { id: true, name: true } },
            sets: { orderBy: { setNumber: 'asc' as const } },
          },
        },
      },
      orderBy: { date: 'asc' },
      take: 5,
    });
  }

  private async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async getFeed(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true },
    });

    const [newTournaments, finishedResults, confirmedFriendlies] = await Promise.all([
      this.getNewTournamentsNearby(user),
      this.getFinishedResults(userId),
      this.getConfirmedFriendlies(userId),
    ]);

    return [...newTournaments, ...finishedResults, ...confirmedFriendlies]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }

  private async getNewTournamentsNearby(user: { latitude: number | null; longitude: number | null } | null) {
    if (!user?.latitude || !user?.longitude) return [];

    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos((user.latitude * Math.PI) / 180);
    const radius = 100;
    const latDelta = radius / kmPerDegreeLat;
    const lngDelta = radius / kmPerDegreeLng;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const tournaments = await this.prisma.tournament.findMany({
      where: {
        createdAt: { gte: weekAgo },
        status: { not: TournamentStatus.CANCELLED },
        stages: {
          some: {
            latitude: {
              gte: user.latitude - latDelta,
              lte: user.latitude + latDelta,
            },
            longitude: {
              gte: user.longitude - lngDelta,
              lte: user.longitude + lngDelta,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        stages: { select: { street: true, number: true, neighborhood: true, city: true, state: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return tournaments.map((t) => ({
      type: 'NEW_TOURNAMENT' as const,
      referenceId: t.id,
      title: `Novo torneio: ${t.name}`,
      subtitle: t.stages[0]?.city ? `${t.stages[0].city}, ${t.stages[0].state}` : undefined,
      timestamp: t.createdAt,
    }));
  }

  private async getFinishedResults(userId: string) {
    const registrations = await this.prisma.registration.findMany({
      where: {
        userId,
        status: RegistrationStatus.CONFIRMED,
        tournament: { status: TournamentStatus.FINISHED },
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
            brackets: {
              include: {
                matches: {
                  where: { winnerId: { not: null } },
                  include: { winner: { select: { id: true, name: true } } },
                  take: 1,
                  orderBy: { round: 'desc' },
                },
              },
              take: 1,
            },
          },
        },
      },
      take: 5,
    });

    return registrations.map((r) => ({
      type: 'TOURNAMENT_RESULT' as const,
      referenceId: r.tournament.id,
      title: `Resultado: ${r.tournament.name}`,
      subtitle: r.tournament.brackets[0]?.matches[0]?.winner?.name
        ? `Campeão: ${r.tournament.brackets[0].matches[0].winner.name}`
        : undefined,
      timestamp: r.tournament.updatedAt,
    }));
  }

  private async getConfirmedFriendlies(userId: string) {
    const friendlies = await this.prisma.friendly.findMany({
      where: {
        status: FriendlyStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { challengedId: userId }],
      },
      select: {
        id: true,
        date: true,
        city: true,
        requester: { select: { name: true } },
        challenged: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
      take: 5,
    });

    return friendlies.map((f) => ({
      type: 'FRIENDLY_CONFIRMED' as const,
      referenceId: f.id,
      title: `Amistoso confirmado`,
      subtitle: `${f.requester.name} vs ${f.challenged?.name || 'Time adversário'}${f.city ? ` — ${f.city}` : ''}`,
      timestamp: f.date,
    }));
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
