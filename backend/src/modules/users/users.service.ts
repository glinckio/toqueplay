import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';
import { StorageService } from '../storage/storage.service';
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
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        bio: true,
        isFirstAccess: true,
        notificationPreferences: true,
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
        isFirstAccess: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        bio: true,
        isFirstAccess: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async updateLocation(
    userId: string,
    data: { latitude: number; longitude: number; enableLocationNotifications?: boolean },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        ...(data.enableLocationNotifications !== undefined && {
          enableLocationNotifications: data.enableLocationNotifications,
        }),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        enableLocationNotifications: true,
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
        phone: true,
        bio: true,
        isFirstAccess: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stats = await this.prisma.athleteStats.findMany({
      where: { userId },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true } },
        tournament: {
          select: {
            id: true,
            name: true,
            stages: { select: { date: true }, orderBy: { date: 'asc' } },
            _count: { select: { registrations: true } },
          },
        },
      },
    });

    const totals = stats.reduce(
      (acc, s) => ({
        matchesPlayed: acc.matchesPlayed + s.matchesPlayed,
        matchesWon: acc.matchesWon + s.matchesWon,
        setsWon: acc.setsWon + s.setsWon,
        pointsScored: acc.pointsScored + s.pointsScored,
        mvpCount: acc.mvpCount + s.mvpCount,
      }),
      { matchesPlayed: 0, matchesWon: 0, setsWon: 0, pointsScored: 0, mvpCount: 0 },
    );

    return {
      user,
      totals: {
        ...totals,
        winRate: totals.matchesPlayed > 0
          ? Math.round((totals.matchesWon / totals.matchesPlayed) * 100)
          : 0,
      },
      byTournament: stats.map((s) => ({
        tournament: s.tournament,
        team: s.team,
        matchesPlayed: s.matchesPlayed,
        matchesWon: s.matchesWon,
        setsWon: s.setsWon,
        pointsScored: s.pointsScored,
        mvpCount: s.mvpCount,
      })),
    };
  }
}
