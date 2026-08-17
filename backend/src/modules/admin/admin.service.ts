import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { TwoFactorService } from '../auth/two-factor.service';
import { NotificationService } from '../../common/services/notification.service';
import { maskEmail, maskName, maskPhone, toCsv } from '../../common/utils/pii-masking';
import { parseDate } from '../../common/utils/date';
import { assertImageFile } from '../../common/utils/file-validation';
import { AppError } from '../../common/errors/app-error';
import { QueryUsersDto } from './dto/query-users.dto';
import { QueryAdminTournamentsDto } from './dto/query-admin-tournaments.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { QueryAdminMatchesDto } from './dto/query-matches.dto';
import { QueryAdminAthletesDto } from './dto/query-athletes.dto';
import { UpdateTournamentAdminDto } from './dto/update-tournament-admin.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import {
  CreateFriendlyAdminDto,
  UpdateFriendlyAdminDto,
} from './dto/friendly-admin.dto';
import { QueryAdminFriendliesDto } from './dto/query-friendlies.dto';
import { CreateTournamentAdminDto } from './dto/create-tournament-admin.dto';
import {
  CreateRegistrationAdminDto,
  UpdateRegistrationMemberAdminDto,
  AddRegistrationMemberAdminDto,
} from './dto/registration-admin.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const DASHBOARD_CACHE_KEY = 'admin:dashboard:v2';
const DASHBOARD_CACHE_TTL = 300; // 5 minutes
const MAINTENANCE_KEY = 'system:maintenance';
const GLOBAL_MESSAGE_KEY = 'system:globalMessage';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private storage: StorageService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
    private notificationService: NotificationService,
  ) {}

  // ─── Dashboard ───────────────────────────────────────────

  async getDashboard() {
    const cached = await this.redis.get(DASHBOARD_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      tournamentsByStatus,
      totalMatches,
      totalTeams,
      regsLast7d,
      usersByRoleRows,
      modalityRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          refreshTokens: { some: { createdAt: { gte: thirtyDaysAgo } } },
        },
      }),
      this.prisma.tournament.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.match.count(),
      this.prisma.team.count(),
      this.prisma.registration.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      this.prisma.tournamentCategory.groupBy({
        by: ['modality'],
        _count: { modality: true },
      }),
    ]);

    const tournamentsCount: Record<string, number> = {};
    for (const row of tournamentsByStatus) {
      tournamentsCount[row.status] = row._count.status;
    }

    // Inscrições por dia (últimos 7)
    const registrationsByDay: { day: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = regsLast7d.filter((r) => r.createdAt >= d && r.createdAt < next).length;
      registrationsByDay.push({
        day: String(d.getDate()).padStart(2, '0'),
        value: count,
      });
    }

    const roleColors: Record<string, string> = {
      ATLETA: '#6D2EC0',
      ORGANIZADOR: '#A674F0',
      SUPER_ADMIN: '#F0A030',
    };
    const roleLabels: Record<string, string> = {
      ATLETA: 'Atletas',
      ORGANIZADOR: 'Organizadores',
      SUPER_ADMIN: 'Admins',
    };
    const usersByRole = usersByRoleRows.map((r) => ({
      name: roleLabels[r.role] ?? r.role,
      value: r._count.role,
      color: roleColors[r.role] ?? '#A89BBA',
    }));

    const modalityColors: Record<string, string> = {
      BEACH: '#F0A030',
      COURT: '#6D2EC0',
    };
    const modalityLabels: Record<string, string> = {
      BEACH: 'Praia',
      COURT: 'Quadra',
    };
    const modalityTotal = modalityRows.reduce((s, r) => s + r._count.modality, 0) || 1;
    const modalityBreakdown = modalityRows.map((r) => ({
      name: modalityLabels[r.modality] ?? r.modality,
      value: Math.round((r._count.modality / modalityTotal) * 100),
      color: modalityColors[r.modality] ?? '#A89BBA',
    }));

    const result = {
      totalUsers,
      activeUsersLast30d: activeUsers,
      tournamentsByStatus: tournamentsCount,
      totalMatches,
      totalTeams,
      registrationsByDay,
      usersByRole,
      modalityBreakdown,
      registrationsPending: await this.prisma.registration.count({
        where: { status: 'PENDING_CONFIRMATION' },
      }),
    };

    await this.redis.set(
      DASHBOARD_CACHE_KEY,
      JSON.stringify(result),
      DASHBOARD_CACHE_TTL,
    );

    return result;
  }

  // ─── User Management ─────────────────────────────────────

  async listUsers(query: QueryUsersDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * CSV export of all users. By default PII is masked (LGPD minimization on
   * bulk exports). Full-PII export requires a 2FA-verified unlock token
   * issued by `unlockFullPiiExport`.
   */
  async exportUsersCsv(opts: { fullPii?: boolean } = {}): Promise<string> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const fullPii = !!opts.fullPii;

    const rows = users.map((u) => ({
      id: u.id,
      name: fullPii ? u.name : maskName(u.name),
      email: fullPii ? u.email : maskEmail(u.email),
      phone: fullPii ? u.phone ?? '' : maskPhone(u.phone),
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));

    return toCsv(rows, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefone' },
      { key: 'role', label: 'Perfil' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Criado em' },
    ]);
  }

  /**
   * Verifies the admin's 2FA code and issues a single-use, short-lived
   * (5 min) unlock token authorizing one full-PII export. Requires the
   * admin to have 2FA enabled. Token nonce is persisted in Redis to
   * guarantee single use even before JWT exp.
   */
  async unlockFullPiiExport(adminId: string, code: string): Promise<string> {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { twoFactorEnabled: true },
    });
    if (!admin?.twoFactorEnabled) {
      throw AppError.consentRequired();
    }

    const ok = await this.twoFactorService.verifyToken(adminId, code);
    if (!ok) {
      throw AppError.invalidOrExpiredCode();
    }

    const nonce = crypto.randomUUID();
    const token = this.jwtService.sign(
      { sub: adminId, purpose: 'pii-export', nonce },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '5m',
      },
    );
    await this.redis.set(`pii:export:${nonce}`, adminId, 5 * 60);
    return token;
  }

  /**
   * Validates an unlock token issued by unlockFullPiiExport. Consumes the
   * nonce (single-use). Throws AppError on any failure.
   */
  async assertFullPiiUnlock(token: string): Promise<string> {
    let payload: { sub: string; purpose?: string; nonce?: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw AppError.invalidOrExpiredCode();
    }
    if (payload.purpose !== 'pii-export' || !payload.nonce) {
      throw AppError.invalidOrExpiredCode();
    }
    const owner = await this.redis.get(`pii:export:${payload.nonce}`);
    if (!owner || owner !== payload.sub) {
      throw AppError.invalidOrExpiredCode();
    }
    await this.redis.del(`pii:export:${payload.nonce}`);
    return payload.sub;
  }

  async blockUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.userNotFound();
    if (user.status === 'BLOCKED') throw AppError.userAlreadyBlocked();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'BLOCKED' },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    return { id: userId, status: 'BLOCKED' };
  }

  async unblockUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.userNotFound();
    if (user.status === 'ACTIVE') throw AppError.userAlreadyActive();

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  // ─── Tournament Management ───────────────────────────────

  async listTournaments(query: QueryAdminTournamentsDto) {
    const { page = 1, limit = 20, status, search, modality, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TournamentWhereInput = {};
    // Soft-delete filter: hidden unless admin explicitly asks via includeDeleted
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }
    if (status) where.status = status as never;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (modality) {
      where.categories = { some: { modality } };
    }
    if (from || to) {
      where.stages = {
        some: {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        },
      };
    }

    const [tournaments, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { registrations: true, brackets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      data: tournaments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async blockTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) throw AppError.tournamentNotFound();
    if (tournament.status === 'CANCELLED')
      throw AppError.tournamentAlreadyDeleted();

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'CANCELLED', isPublished: false },
      select: { id: true, name: true, status: true },
    });
  }

  async deleteTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) throw AppError.tournamentNotFound();
    if (tournament.deletedAt) throw AppError.tournamentAlreadyDeleted();

    // Soft delete: hide from listings, keep row for referential integrity.
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        deletedAt: new Date(),
        status: 'CANCELLED',
        isPublished: false,
      },
      select: { id: true, name: true, status: true, deletedAt: true },
    });
  }

  async getTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        categories: true,
        stages: true,
        sponsors: true,
        _count: {
          select: {
            registrations: true,
            brackets: true,
            athleteStats: true,
          },
        },
      },
    });
    if (!tournament) throw AppError.tournamentNotFound();
    return tournament;
  }

  // Update admin bypass — sem checagens de regra de negócio.
  async updateTournament(tournamentId: string, dto: UpdateTournamentAdminDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { categories: { take: 1 }, stages: { take: 1 } },
    });
    if (!tournament) throw AppError.tournamentNotFound();

    const { category, stage, ...tournamentFields } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          ...(tournamentFields.name !== undefined && { name: tournamentFields.name }),
          ...(tournamentFields.description !== undefined && {
            description: tournamentFields.description,
          }),
          ...(tournamentFields.imageUrl !== undefined && {
            imageUrl: tournamentFields.imageUrl,
          }),
          ...(tournamentFields.eventType !== undefined && {
            eventType: tournamentFields.eventType as never,
          }),
          ...(tournamentFields.status !== undefined && {
            status: tournamentFields.status as never,
          }),
          ...(tournamentFields.isPublished !== undefined && {
            isPublished: tournamentFields.isPublished,
          }),
        },
      });

      if (category && tournament.categories[0]) {
        await tx.tournamentCategory.update({
          where: { id: tournament.categories[0].id },
          data: {
            ...(category.type !== undefined && { type: category.type as never }),
            ...(category.format !== undefined && { format: category.format as never }),
            ...(category.modality !== undefined && { modality: category.modality as never }),
            ...(category.minMembers !== undefined && { minMembers: category.minMembers }),
            ...(category.maxMembers !== undefined && { maxMembers: category.maxMembers }),
            ...(category.bestOfSets !== undefined && { bestOfSets: category.bestOfSets }),
            ...(category.tiebreakScore !== undefined && {
              tiebreakScore: category.tiebreakScore,
            }),
            ...(category.registrationPrice !== undefined && {
              registrationPrice: category.registrationPrice,
            }),
          },
        });
      }

      if (stage && tournament.stages[0]) {
        await tx.tournamentStage.update({
          where: { id: tournament.stages[0].id },
          data: {
            ...(stage.name !== undefined && { name: stage.name }),
            ...(stage.date !== undefined && { date: new Date(stage.date) }),
            ...(stage.startTime !== undefined && {
              startTime: new Date(stage.startTime),
            }),
            ...(stage.maxTeams !== undefined && { maxTeams: stage.maxTeams }),
            ...(stage.city !== undefined && { city: stage.city }),
            ...(stage.state !== undefined && { state: stage.state }),
            ...(stage.address !== undefined && { address: stage.address }),
          },
        });
      }

      return tx.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          categories: true,
          stages: true,
        },
      });
    });
  }

  // ─── Error Logs ──────────────────────────────────────────

  async getLogs(query: QueryLogsDto) {
    const { level, source, from, to } = query;

    const where: any = {};
    if (level) where.level = level;
    if (source) where.source = source;
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    return this.prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── Monitoring ──────────────────────────────────────────

  async getMonitoring() {
    const [activeMatches, onlineUsers] = await Promise.all([
      this.prisma.match.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.refreshToken.findMany({
        where: { expiresAt: { gt: new Date() } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    // WebSocket connections tracked via Redis if available
    const wsConnections = await this.redis.get('monitoring:ws_connections');
    const wsCount = wsConnections ? parseInt(wsConnections, 10) : 0;

    return {
      activeMatches,
      onlineUsers: onlineUsers.length,
      webSocketConnections: wsCount,
    };
  }

  // ─── System Control ──────────────────────────────────────

  async getSystem() {
    const [maintenanceFlag, globalMessage] = await Promise.all([
      this.redis.get(MAINTENANCE_KEY),
      this.redis.get(GLOBAL_MESSAGE_KEY),
    ]);

    return {
      maintenanceMode: maintenanceFlag === 'true',
      globalMessage: globalMessage ?? null,
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }

  async updateSystem(dto: UpdateSystemDto) {
    if (dto.maintenanceMode !== undefined) {
      if (dto.maintenanceMode) {
        await this.redis.set(MAINTENANCE_KEY, 'true');
      } else {
        await this.redis.del(MAINTENANCE_KEY);
      }
    }

    if (dto.globalMessage !== undefined) {
      if (dto.globalMessage) {
        await this.redis.set(GLOBAL_MESSAGE_KEY, dto.globalMessage);
      } else {
        await this.redis.del(GLOBAL_MESSAGE_KEY);
      }
    }

    return this.getSystem();
  }

  // ─── Metrics ─────────────────────────────────────────────

  async getMetrics(query: QueryMetricsDto) {
    const { from, to } = query;

    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [
      totalUsers,
      newUsers,
      totalTournaments,
      totalMatches,
      totalRegistrations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: dateFilter }),
      this.prisma.tournament.count({ where: dateFilter }),
      this.prisma.match.count({
        where: dateFilter.createdAt
          ? { scheduledAt: dateFilter.createdAt }
          : {},
      }),
      this.prisma.registration.count({ where: dateFilter }),
    ]);

    return {
      totalUsers,
      newUsersInPeriod: newUsers,
      totalTournaments,
      totalMatches,
      totalRegistrations,
      period: { from: from ?? null, to: to ?? null },
    };
  }

  // ─── Match Management ────────────────────────────────────

  async listMatches(query: QueryAdminMatchesDto) {
    const { page = 1, limit = 20, status, type, tournamentId, friendlyId, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MatchWhereInput = {};
    if (status) where.status = status as never;
    if (type === 'tournament') where.bracketId = { not: null };
    if (type === 'friendly') where.friendlyId = { not: null };
    if (tournamentId) where.bracket = { tournamentId };
    if (friendlyId) where.friendlyId = friendlyId;
    if (from || to) {
      where.scheduledAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const include = {
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
      bracket: {
        select: {
          id: true,
          tournamentId: true,
          tournament: { select: { id: true, name: true } },
        },
      },
      friendly: {
        select: {
          id: true,
          title: true,
          requesterTeam: { select: { id: true, name: true } },
          challengedTeam: { select: { id: true, name: true } },
        },
      },
    } satisfies Prisma.MatchInclude;

    const [matches, total] = await Promise.all([
      this.prisma.match.findMany({ where, include, orderBy: { scheduledAt: 'desc' }, skip, take: limit }),
      this.prisma.match.count({ where }),
    ]);

    return {
      data: matches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { id: true, name: true } },
        teamB: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
        bracket: {
          select: {
            id: true,
            tournamentId: true,
            tournament: { select: { id: true, name: true } },
          },
        },
        friendly: {
          select: {
            id: true,
            title: true,
            requesterTeam: { select: { id: true, name: true } },
            challengedTeam: { select: { id: true, name: true } },
          },
        },
        sets: { orderBy: { setNumber: 'asc' } },
        matchEvents: {
          orderBy: { createdAt: 'asc' },
        },
        pointEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
    if (!match) throw new BadRequestException('Partida não encontrada');
    return match;
  }

  // ─── Athlete Management ──────────────────────────────────

  async listAthletes(query: QueryAdminAthletesDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { role: 'ATLETA' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const select = {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      phone: true,
      status: true,
      createdAt: true,
      athleteStats: {
        select: {
          matchesPlayed: true,
          matchesWon: true,
          setsWon: true,
          pointsScored: true,
          mvpCount: true,
        },
      },
      _count: { select: { teamMembers: true } },
    } satisfies Prisma.UserSelect;

    const [athletes, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = athletes.map((a) => {
      const stats = a.athleteStats.reduce(
        (acc, s) => {
          acc.matchesPlayed += s.matchesPlayed;
          acc.matchesWon += s.matchesWon;
          acc.setsWon += s.setsWon;
          acc.pointsScored += s.pointsScored;
          acc.mvpCount += s.mvpCount;
          return acc;
        },
        {
          matchesPlayed: 0,
          matchesWon: 0,
          setsWon: 0,
          pointsScored: 0,
          mvpCount: 0,
        },
      );
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        avatarUrl: a.avatarUrl,
        phone: a.phone,
        status: a.status,
        createdAt: a.createdAt,
        teamsCount: a._count.teamMembers,
        stats,
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── User Detail/Update (admin bypass) ───────────────────

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        phone: true,
        bio: true,
        isEmailVerified: true,
        createdAt: true,
        _count: {
          select: {
            teams: true,
            teamMembers: true,
            registrations: true,
            tournaments: true,
          },
        },
      },
    });
    if (!user) throw AppError.userNotFound();
    return user;
  }

  async updateUser(userId: string, dto: UpdateUserAdminDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.userNotFound();

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role as never;
    if (dto.status !== undefined) data.status = dto.status as never;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        phone: true,
        bio: true,
        isEmailVerified: true,
      },
    });
  }

  // ─── Friendly Management (admin) ─────────────────────────

  async listFriendlies(query: QueryAdminFriendliesDto) {
    const { page = 1, limit = 20, status, search, modality, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FriendlyWhereInput = {};
    if (status) where.status = status as never;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (modality) where.modality = modality;
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const include = {
      requester: { select: { id: true, name: true, email: true } },
      requesterTeam: { select: { id: true, name: true } },
      challenged: { select: { id: true, name: true, email: true } },
      challengedTeam: { select: { id: true, name: true } },
    } satisfies Prisma.FriendlyInclude;

    const [friendlies, total] = await Promise.all([
      this.prisma.friendly.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.friendly.count({ where }),
    ]);

    return {
      data: friendlies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFriendly(friendlyId: string) {
    const friendly = await this.prisma.friendly.findUnique({
      where: { id: friendlyId },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        requesterTeam: { select: { id: true, name: true } },
        challenged: { select: { id: true, name: true, email: true } },
        challengedTeam: { select: { id: true, name: true } },
      },
    });
    if (!friendly) throw AppError.userNotFound();
    return friendly;
  }

  async createFriendly(dto: CreateFriendlyAdminDto) {
    return this.prisma.friendly.create({
      data: {
        title: dto.title,
        requesterId: dto.requesterId,
        requesterTeamId: dto.requesterTeamId,
        challengedId: dto.challengedId,
        challengedTeamId: dto.challengedTeamId,
        status: (dto.status ?? 'PENDING') as never,
        date: parseDate(dto.date) ?? new Date(),
        startTime: dto.startTime ? parseDate(dto.startTime) : null,
        city: dto.city,
        state: dto.state,
        address: dto.address,
        modality: dto.modality,
        categoryFormat: dto.categoryFormat,
      },
    });
  }

  async updateFriendly(friendlyId: string, dto: UpdateFriendlyAdminDto) {
    const existing = await this.prisma.friendly.findUnique({
      where: { id: friendlyId },
    });
    if (!existing) throw AppError.userNotFound();

    return this.prisma.friendly.update({
      where: { id: friendlyId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.requesterId !== undefined && { requesterId: dto.requesterId }),
        ...(dto.requesterTeamId !== undefined && {
          requesterTeamId: dto.requesterTeamId,
        }),
        ...(dto.challengedId !== undefined && { challengedId: dto.challengedId }),
        ...(dto.challengedTeamId !== undefined && {
          challengedTeamId: dto.challengedTeamId,
        }),
        ...(dto.status !== undefined && { status: dto.status as never }),
        ...(dto.date !== undefined && { date: parseDate(dto.date) ?? new Date() }),
        ...(dto.startTime !== undefined && {
          startTime: dto.startTime ? parseDate(dto.startTime) : null,
        }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.scoreTeamA !== undefined && { scoreTeamA: dto.scoreTeamA }),
        ...(dto.scoreTeamB !== undefined && { scoreTeamB: dto.scoreTeamB }),
      },
    });
  }

  async deleteFriendly(friendlyId: string) {
    const existing = await this.prisma.friendly.findUnique({
      where: { id: friendlyId },
    });
    if (!existing) throw AppError.userNotFound();
    await this.prisma.friendly.delete({ where: { id: friendlyId } });
    return { id: friendlyId, deleted: true };
  }

  // ─── Recent Activity (feed de notificações admin) ────────

  async getRecentActivity(limit = 20, offset = 0) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [newUsers, newTournaments, newFriendlies] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.tournament.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.friendly.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          title: true,
          status: true,
          requester: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    type ActivityItem = {
      id: string;
      type: 'USER' | 'TOURNAMENT' | 'FRIENDLY';
      title: string;
      subtitle?: string;
      tone: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
      createdAt: string;
    };

    const items: ActivityItem[] = [];

    for (const u of newUsers) {
      items.push({
        id: `u-${u.id}`,
        type: 'USER',
        title: `${u.name} se cadastrou`,
        subtitle: `${u.email} · ${u.role}`,
        tone: 'neutral',
        createdAt: u.createdAt.toISOString(),
      });
    }

    for (const t of newTournaments) {
      items.push({
        id: `t-${t.id}`,
        type: 'TOURNAMENT',
        title: `Novo torneio: ${t.name}`,
        subtitle: t.owner?.name ? `por ${t.owner.name}` : undefined,
        tone: 'info',
        createdAt: t.createdAt.toISOString(),
      });
    }

    for (const f of newFriendlies) {
      items.push({
        id: `f-${f.id}`,
        type: 'FRIENDLY',
        title: `Amistoso: ${f.title ?? 'sem título'}`,
        subtitle: f.requester?.name ? `desafiante ${f.requester.name}` : undefined,
        tone: 'neutral',
        createdAt: f.createdAt.toISOString(),
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return items.slice(0, limit);
  }

  // ─── Teams (lista simples p/ selectors admin) ────────────

  async listTeams(query: { search?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 100, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TeamWhereInput = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        select: {
          id: true,
          name: true,
          sport: true,
          ownerId: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.team.count({ where }),
    ]);

    return { data: teams, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Tournament full create (admin) ──────────────────────

  async createTournamentFull(dto: CreateTournamentAdminDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: dto.ownerId } });
    if (!owner) throw new BadRequestException('Organizador não encontrado');

    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        ownerId: dto.ownerId,
        eventType: (dto.eventType ?? 'SINGLE') as never,
        status: (dto.status ?? 'DRAFT') as never,
        isPublished: dto.isPublished ?? false,
        categories: {
          create: {
            type: dto.category.type as never,
            format: dto.category.format as never,
            modality: dto.category.modality as never,
            minMembers: dto.category.minMembers ?? 2,
            maxMembers: dto.category.maxMembers ?? 2,
            bestOfSets: dto.category.bestOfSets ?? 3,
            tiebreakScore: dto.category.tiebreakScore ?? 15,
            registrationPrice: dto.category.registrationPrice ?? 0,
            ...(dto.category.bracketType
              ? { bracketType: dto.category.bracketType as never }
              : {}),
          },
        },
        stages: {
          create: {
            name: dto.stage.name ?? 'Etapa Única',
            date: parseDate(dto.stage.date) ?? new Date(),
            startTime: dto.stage.startTime ? parseDate(dto.stage.startTime) : null,
            maxTeams: dto.stage.maxTeams ?? 16,
            city: dto.stage.city,
            state: dto.stage.state,
            address: dto.stage.address,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        categories: true,
        stages: true,
      },
    });
  }

  async changeTournamentOwner(tournamentId: string, ownerId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw AppError.tournamentNotFound();
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new BadRequestException('Organizador não encontrado');

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { ownerId },
      select: { id: true, ownerId: true, owner: { select: { id: true, name: true, email: true } } },
    });
  }

  // ─── Banners + cover upload (admin bypass) ───────────────

  async getBanners(): Promise<string[]> {
    const publicUrl = process.env.MINIO_PUBLIC_URL;
    const bucket = process.env.MINIO_BUCKET ?? 'toqueplay';
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const host = process.env.MINIO_ENDPOINT ?? 'localhost';
    const port = process.env.MINIO_PORT ?? '9000';
    const baseUrl = publicUrl ? `${publicUrl}/${bucket}` : `${protocol}://${host}:${port}/${bucket}`;
    const defaultKeys = [
      'banners/WhatsApp Image 2026-06-10 at 12.04.25 AM.jpeg',
      'banners/WhatsApp Image 2026-06-10 at 12.10.36 AM.jpeg',
      'banners/WhatsApp Image 2026-06-10 at 12.10.46 AM.jpeg',
      'banners/WhatsApp Iamage 2026-06-10 at 12.04.25 AM.jpeg',
    ];
    return defaultKeys.map((k) => `${baseUrl}/${k}`);
  }

  async uploadCover(tournamentId: string, file: Express.Multer.File) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw AppError.tournamentNotFound();

    await assertImageFile(file, 10 * 1024 * 1024);

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `tournaments/${tournamentId}/cover-${Date.now()}.${ext}`;

    if (tournament.imageUrl) {
      const oldKey = this.storage.extractKeyFromUrl(tournament.imageUrl);
      if (oldKey) await this.storage.deleteFile(oldKey);
    }
    const imageUrl = await this.storage.uploadFile(file.buffer, key, file.mimetype);
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { imageUrl },
      select: { id: true, imageUrl: true },
    });
  }

  // ─── Registrations management (admin) ────────────────────

  async listRegistrations(tournamentId: string) {
    const regs = await this.prisma.registration.findMany({
      where: { tournamentId },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, type: true, modality: true } },
        members: {
          include: {
            teamMember: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return regs;
  }

  async createRegistration(tournamentId: string, dto: CreateRegistrationAdminDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { categories: { take: 1 } },
    });
    if (!tournament) throw AppError.tournamentNotFound();
    const category = tournament.categories[0];
    if (!category) throw new BadRequestException('Torneio sem categoria');

    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) throw new BadRequestException('Time não encontrado');

    // Validar membros únicos dentro do torneio
    const memberIds = dto.members.map((m) => m.teamMemberId);
    const existingMembers = await this.prisma.registrationMember.findMany({
      where: {
        teamMemberId: { in: memberIds },
        registration: { tournamentId },
      },
      select: { teamMemberId: true },
    });
    if (existingMembers.length > 0) {
      const dup = existingMembers.map((m) => m.teamMemberId).join(', ');
      throw new BadRequestException(
        `Membros já inscritos neste torneio em outra inscrição: ${dup}`,
      );
    }

    // Validar pertencem ao time
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { id: { in: memberIds }, teamId: dto.teamId },
      select: { id: true },
    });
    if (teamMembers.length !== memberIds.length) {
      throw new BadRequestException('Um ou mais membros não pertencem ao time informado');
    }

    // Valida min/max
    if (memberIds.length < category.minMembers || memberIds.length > category.maxMembers) {
      throw new BadRequestException(
        `Quantidade de membros inválida (${memberIds.length}). Permitido entre ${category.minMembers} e ${category.maxMembers}.`,
      );
    }

    return this.prisma.registration.create({
      data: {
        tournamentId,
        categoryId: category.id,
        teamId: dto.teamId,
        userId: dto.userId,
        status: (dto.status ?? 'CONFIRMED') as never,
        paidAt: (dto.status ?? 'CONFIRMED') === 'CONFIRMED' ? new Date() : null,
        members: {
          create: dto.members.map((m) => ({
            teamMemberId: m.teamMemberId,
            isCaptain: Boolean(m.isCaptain),
          })),
        },
      },
      include: {
        team: true,
        members: { include: { teamMember: { include: { user: true } } } },
      },
    });
  }

  async deleteRegistration(regId: string) {
    const reg = await this.prisma.registration.findUnique({ where: { id: regId } });
    if (!reg) throw new BadRequestException('Inscrição não encontrada');
    await this.prisma.registration.delete({ where: { id: regId } });
    return { id: regId, deleted: true };
  }

  // Marcar manualmente quem pagou (organizador/admin no console).
  // paid=true => CONFIRMED + paidAt (+ notifica os atletas).
  // paid=false => volta para PENDING_CONFIRMATION (ainda não pagou).
  async setRegistrationPaid(regId: string, paid: boolean) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: {
        tournament: { select: { id: true, name: true } },
        members: {
          include: { teamMember: { include: { user: { select: { id: true } } } } },
        },
      },
    });
    if (!reg) throw new BadRequestException('Inscrição não encontrada');

    // Só faz sentido alternar pago/pendente em inscrições ativas.
    // Canceladas/Rejeitadas não podem ser "revividas" pelo toggle de pagamento.
    if (reg.status !== 'PENDING_CONFIRMATION' && reg.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Inscrição cancelada ou rejeitada não pode ser marcada como paga',
      );
    }

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: paid
        ? { status: 'CONFIRMED', paidAt: new Date() }
        : { status: 'PENDING_CONFIRMATION', paidAt: null },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            teamMember: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          },
        },
      },
    });

    if (paid) {
      const memberUserIds = reg.members
        .map((m) => m.teamMember?.user?.id)
        .filter((id): id is string => !!id);
      if (memberUserIds.length > 0) {
        await this.notificationService.sendToUsers(memberUserIds, {
          title: 'Inscrição Confirmada!',
          body: `Sua inscrição no torneio "${reg.tournament.name}" foi confirmada.`,
          type: 'REGISTRATION_CONFIRMED',
          referenceId: reg.tournament.id,
        });
      }
    }

    return updated;
  }

  async addRegistrationMember(
    regId: string,
    dto: AddRegistrationMemberAdminDto,
  ) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: { category: true },
    });
    if (!reg) throw new BadRequestException('Inscrição não encontrada');

    // Não pode ser membro duplicado neste torneio
    const exists = await this.prisma.registrationMember.findFirst({
      where: {
        teamMemberId: dto.teamMemberId,
        registration: { tournamentId: reg.tournamentId },
      },
    });
    if (exists) {
      throw new BadRequestException('Membro já inscrito em outra inscrição do torneio');
    }

    // count check
    const count = await this.prisma.registrationMember.count({
      where: { registrationId: regId },
    });
    if (reg.category && count >= reg.category.maxMembers) {
      throw new BadRequestException('Limite de membros da categoria atingido');
    }

    return this.prisma.registrationMember.create({
      data: {
        registrationId: regId,
        teamMemberId: dto.teamMemberId,
        isCaptain: Boolean(dto.isCaptain),
      },
      include: {
        teamMember: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });
  }

  async removeRegistrationMember(regId: string, memberId: string) {
    const m = await this.prisma.registrationMember.findUnique({
      where: { id: memberId },
    });
    if (!m || m.registrationId !== regId) {
      throw new BadRequestException('Membro não pertence a esta inscrição');
    }
    await this.prisma.registrationMember.delete({ where: { id: memberId } });
    return { id: memberId, deleted: true };
  }

  async updateRegistrationMember(
    regId: string,
    memberId: string,
    dto: UpdateRegistrationMemberAdminDto,
  ) {
    const m = await this.prisma.registrationMember.findUnique({
      where: { id: memberId },
    });
    if (!m || m.registrationId !== regId) {
      throw new BadRequestException('Membro não pertence a esta inscrição');
    }

    const data: Prisma.RegistrationMemberUpdateInput = {};
    if (dto.isCaptain !== undefined) data.isCaptain = Boolean(dto.isCaptain);

    // Se está virando capitão, remover capitania dos outros da mesma inscrição
    if (dto.isCaptain === 1) {
      await this.prisma.registrationMember.updateMany({
        where: { registrationId: regId, id: { not: memberId } },
        data: { isCaptain: false },
      });
    }

    return this.prisma.registrationMember.update({
      where: { id: memberId },
      data,
    });
  }
}
