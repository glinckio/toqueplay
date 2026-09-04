import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';
import { StorageService } from '../storage/storage.service';
import { TeamsService } from '../teams/teams.service';
import { AppError } from '../../common/errors/app-error';
import { assertImageFile } from '../../common/utils/file-validation';

const MAX_SIZE = 5 * 1024 * 1024;

const DEFAULT_NOTIFICATION_PREFS = {
  messages: true,
  invites: true,
  matches: true,
  friendlies: true,
  tournaments: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private teamsService: TeamsService,
  ) {}

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        phone: true,
        nameColor: true,
        emailColor: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stats = await this.getUserStats(userId);

    return { ...user, stats };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bannerUrl: true,
        themeMode: true,
        phone: true,
        bio: true,
        nameColor: true,
        emailColor: true,
        isFirstAccess: true,
        notificationPreferences: true,
        latitude: true,
        longitude: true,
        nearbyRadiusKm: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        phone: dto.phone === '' ? null : dto.phone,
        bio: dto.bio === '' ? null : dto.bio,
        nameColor: dto.nameColor === '' ? null : dto.nameColor,
        emailColor: dto.emailColor === '' ? null : dto.emailColor,
        isFirstAccess: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bannerUrl: true,
        phone: true,
        bio: true,
        nameColor: true,
        emailColor: true,
        isFirstAccess: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async updateTheme(userId: string, themeMode: 'dark' | 'light') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { themeMode },
      select: { id: true, themeMode: true },
    });
  }

  async updateLocation(
    userId: string,
    data: {
      latitude?: number;
      longitude?: number;
      enableLocationNotifications?: boolean;
      nearbyRadiusKm?: number;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.enableLocationNotifications !== undefined && {
          enableLocationNotifications: data.enableLocationNotifications,
        }),
        ...(data.nearbyRadiusKm !== undefined && { nearbyRadiusKm: data.nearbyRadiusKm }),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        enableLocationNotifications: true,
        nearbyRadiusKm: true,
      },
    });
  }

  async getNotificationPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...DEFAULT_NOTIFICATION_PREFS, ...((user.notificationPreferences as Record<string, boolean>) || {}) };
  }

  async updateNotificationPreferences(userId: string, dto: NotificationPreferencesDto) {
    const current = await this.getNotificationPreferences(userId);
    const updated: Record<string, boolean> = { ...current, ...dto };
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: updated },
    });
    return updated;
  }

  async shouldNotify(userId: string, category: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });
    if (!user) return false;
    const prefs: Record<string, boolean> = { ...DEFAULT_NOTIFICATION_PREFS, ...((user.notificationPreferences as Record<string, boolean>) || {}) };
    return prefs[category] !== false;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await assertImageFile(file, MAX_SIZE);

    if (user.avatarUrl) {
      const oldKey = this.storage.extractKeyFromUrl(user.avatarUrl);
      if (oldKey) await this.storage.deleteFile(oldKey);
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `users/${userId}/avatar-${Date.now()}.${ext}`;
    const avatarUrl = await this.storage.uploadFile(file.buffer, key, file.mimetype);

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bannerUrl: true,
        phone: true,
        bio: true,
        isFirstAccess: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async uploadBanner(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await assertImageFile(file, MAX_SIZE);

    if (user.bannerUrl) {
      const oldKey = this.storage.extractKeyFromUrl(user.bannerUrl);
      if (oldKey) await this.storage.deleteFile(oldKey);
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `users/${userId}/banner-${Date.now()}.${ext}`;
    const bannerUrl = await this.storage.uploadFile(file.buffer, key, file.mimetype);

    return this.prisma.user.update({
      where: { id: userId },
      data: { bannerUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bannerUrl: true,
        phone: true,
        bio: true,
        isFirstAccess: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Torneios/vitórias/win rate mirror the team profile's numbers, pooled
  // across every team this user belongs to — "matches" stays individual
  // (from AthleteStats), since there's no per-tournament equivalent for it.
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [tournamentStats, matchTotals] = await Promise.all([
      this.teamsService.getUserTournamentStats(userId),
      this.prisma.athleteStats.aggregate({
        where: { userId },
        _sum: { matchesPlayed: true },
      }),
    ]);

    return {
      tournaments: tournamentStats.tournaments,
      wins: tournamentStats.wins,
      winRate: tournamentStats.winRate,
      teams: tournamentStats.teams,
      matches: matchTotals._sum.matchesPlayed ?? 0,
    };
  }
}
