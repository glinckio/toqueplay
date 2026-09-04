import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { StorageService } from '../storage/storage.service';
import { BracketsService } from '../brackets/brackets.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { assertImageFile } from '../../common/utils/file-validation';
import { RegistrationStatus, TournamentStatus } from '@prisma/client';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private bracketsService: BracketsService,
  ) {}

  // Computed on demand from real registration/match history — every FINISHED
  // tournament the team had a confirmed registration in counts as "played",
  // and it's a "win" if the team is that tournament's bracket champion.
  private async computeTeamStats(teamId: string) {
    const registrations = await this.prisma.registration.findMany({
      where: { teamId, status: RegistrationStatus.CONFIRMED, tournament: { status: TournamentStatus.FINISHED } },
      select: { tournamentId: true },
    });
    const tournamentIds = [...new Set(registrations.map((r) => r.tournamentId))];
    const tournamentsPlayed = tournamentIds.length;

    let wins = 0;
    for (const tournamentId of tournamentIds) {
      const champions = await this.bracketsService.getTournamentChampionTeamIds(tournamentId);
      if (champions.has(teamId)) wins++;
    }

    const winRate = tournamentsPlayed > 0 ? Math.round((wins / tournamentsPlayed) * 100) : 0;
    return { tournaments: tournamentsPlayed, wins, winRate };
  }

  async create(userId: string, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        city: dto.city,
        state: dto.state,
        ownerId: userId,
        members: {
          create: {
            userId,
            isCaptain: true,
            isGuest: false,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return team;
  }

  async findAll(userId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(teams.map(async (team) => ({ ...team, stats: await this.computeTeamStats(team.id) })));
  }

  async findUserTeamIds(userId: string): Promise<string[]> {
    const teams = await this.prisma.team.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });
    return teams.map((t) => t.id);
  }

  // Same "torneios / vitórias / win rate" idea as computeTeamStats, but
  // pooled across every team the user belongs to (owner or member) — used
  // on the user's profile instead of a single team's page.
  async getUserTournamentStats(userId: string) {
    const teamIds = await this.findUserTeamIds(userId);
    if (teamIds.length === 0) return { tournaments: 0, wins: 0, winRate: 0, teams: 0 };

    const registrations = await this.prisma.registration.findMany({
      where: { teamId: { in: teamIds }, status: RegistrationStatus.CONFIRMED, tournament: { status: TournamentStatus.FINISHED } },
      select: { tournamentId: true },
    });
    const tournamentIds = [...new Set(registrations.map((r) => r.tournamentId))];
    const tournaments = tournamentIds.length;

    const myTeamIds = new Set(teamIds);
    let wins = 0;
    for (const tournamentId of tournamentIds) {
      const champions = await this.bracketsService.getTournamentChampionTeamIds(tournamentId);
      if ([...champions].some((c) => myTeamIds.has(c))) wins++;
    }

    const winRate = tournaments > 0 ? Math.round((wins / tournaments) * 100) : 0;
    return { tournaments, wins, winRate, teams: teamIds.length };
  }

  async search(
    query: string,
    userId: string,
    city?: string,
    state?: string,
    offset = 0,
    limit = 20,
  ) {
    // Empty query means "browse all" — used by Explore when no filters are applied yet.
    const pattern = query?.trim() ? `%${query.trim()}%` : '%';
    const cityPattern = city?.trim() ? `%${city.trim()}%` : null;
    const stateValue = state?.trim() || null;
    const take = limit + 1;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT id, name, "avatarUrl", sport, city, state,
        (SELECT COUNT(*) FROM "TeamMember" tm WHERE tm."teamId" = "Team".id)::int AS "memberCount"
      FROM "Team"
      WHERE "ownerId" != ${userId}::uuid
        AND (unaccent(name) ILIKE unaccent(${pattern})
          OR unaccent(COALESCE(description, '')) ILIKE unaccent(${pattern}))
        AND (${cityPattern}::text IS NULL OR unaccent(COALESCE(city, '')) ILIKE unaccent(${cityPattern}::text))
        AND (${stateValue}::text IS NULL OR UPPER(COALESCE(state, '')) = UPPER(${stateValue}::text))
      ORDER BY name ASC
      LIMIT ${take} OFFSET ${offset}
    `;

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatarUrl,
      sport: r.sport,
      city: r.city,
      state: r.state,
      _count: { members: r.memberCount },
    }));

    return {
      items,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    };
  }

  async findOne(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: [{ isCaptain: 'desc' }, { id: 'asc' }],
        },
      },
    });

    if (!team) {
      throw AppError.teamNotFound();
    }

    const isMember = team.members.some((m) => m.userId === userId);
    if (team.ownerId !== userId && !isMember) {
      throw AppError.teamNotFound();
    }

    const stats = await this.computeTeamStats(teamId);

    return { ...team, stats };
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw AppError.teamNotFound();
    }
    if (team.ownerId !== userId) {
      throw AppError.notTeamOwner();
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: dto,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async remove(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw AppError.teamNotFound();
    }
    if (team.ownerId !== userId) {
      throw AppError.notTeamOwner();
    }

    await this.prisma.team.delete({ where: { id: teamId } });
  }

  async uploadAvatar(teamId: string, userId: string, file: Express.Multer.File) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw AppError.teamNotFound();
    if (team.ownerId !== userId) throw AppError.notTeamOwner();

    await assertImageFile(file, MAX_SIZE);

    // Delete old avatar if exists
    if (team.avatarUrl) {
      const oldKey = this.storage.extractKeyFromUrl(team.avatarUrl);
      if (oldKey) await this.storage.deleteFile(oldKey);
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `teams/${teamId}/avatar-${Date.now()}.${ext}`;
    const avatarUrl = await this.storage.uploadFile(file.buffer, key, file.mimetype);

    return this.prisma.team.update({
      where: { id: teamId },
      data: { avatarUrl },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async verifyOwnership(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw AppError.teamNotFound();
    }
    if (team.ownerId !== userId) {
      throw AppError.notTeamOwner();
    }
    return team;
  }
}
