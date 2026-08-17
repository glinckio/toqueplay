import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail && privateKey !== 'your-firebase-private-key') {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
    }
  }

  async sendToUsers(userIds: string[], payload: { title: string; body: string; type: string; referenceId?: string }) {
    const category = this.mapTypeToCategory(payload.type);

    // Filter users by notification preference
    const eligibleUserIds = await this.filterByPreference(userIds, category);

    // Save in-app notifications for all users (regardless of push preference)
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.createNotification(userId, payload.title, payload.body, payload.type, payload.referenceId),
      ),
    );

    // Send push only to eligible users
    if (this.firebaseApp && eligibleUserIds.length > 0) {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: { in: eligibleUserIds } },
        select: { token: true, userId: true },
      });

      if (tokens.length > 0) {
        const deepLink = this.buildDeepLink(payload.type, payload.referenceId);
        await this.sendPushNotification(
          tokens.map((t: { token: string }) => t.token),
          payload,
          deepLink,
        );
      }
    }

    return notifications;
  }

  async sendToRegion(
    latitude: number,
    longitude: number,
    radiusKm: number,
    payload: { title: string; body: string; type: string; referenceId?: string },
  ) {
    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos((latitude * Math.PI) / 180);
    const latDelta = radiusKm / kmPerDegreeLat;
    const lngDelta = radiusKm / kmPerDegreeLng;

    const users = await this.prisma.user.findMany({
      where: {
        enableLocationNotifications: true,
        latitude: { not: null },
        longitude: { not: null },
        AND: [
          { latitude: { gte: latitude - latDelta } },
          { latitude: { lte: latitude + latDelta } },
          { longitude: { gte: longitude - lngDelta } },
          { longitude: { lte: longitude + lngDelta } },
        ],
      },
      select: { id: true },
    });

    if (users.length === 0) return [];

    return this.sendToUsers(
      users.map((u: { id: string }) => u.id),
      payload,
    );
  }

  async createNotification(userId: string, title: string, body: string, type: string, referenceId?: string) {
    return this.prisma.notification.create({
      data: { userId, title, body, type, referenceId },
    });
  }

  /** Get all registered athlete user IDs for a tournament (via RegistrationMember → TeamMember → User, excluding guests) */
  async getRegisteredAthleteUserIds(tournamentId: string): Promise<string[]> {
    const members = await this.prisma.registrationMember.findMany({
      where: {
        registration: {
          tournamentId,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
        teamMember: { isGuest: false, userId: { not: null } },
      },
      select: { teamMember: { select: { userId: true } } },
    });
    return [...new Set(members.map((m: { teamMember: { userId: string | null } }) => m.teamMember.userId).filter(Boolean) as string[])];
  }

  /** Get all non-guest member user IDs for a team */
  async getTeamMemberUserIds(teamId: string): Promise<string[]> {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, isGuest: false, userId: { not: null } },
      select: { userId: true },
    });
    return [...new Set(members.map((m: { userId: string | null }) => m.userId).filter(Boolean) as string[])];
  }

  private async sendPushNotification(tokens: string[], payload: { title: string; body: string; type: string; referenceId?: string }, deepLink?: string) {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: payload.type,
          ...(payload.referenceId && { referenceId: payload.referenceId }),
          ...(deepLink && { deepLink }),
        },
        apns: {
          payload: { aps: { sound: 'default' } },
        },
        android: {
          notification: { sound: 'default' },
        },
      };

      await admin.messaging().sendEachForMulticast(message);
    } catch (error) {
      this.logger.warn(`FCM send failed: ${(error as Error).message}`);
    }
  }

  private buildDeepLink(type: string, referenceId?: string): string {
    if (!referenceId) return '';
    switch (type) {
      case 'TOURNAMENT':
      case 'BRACKET_GENERATED':
      case 'REGISTRATION':
      case 'REGISTRATION_CONFIRMED':
      case 'TOURNAMENT_STARTED':
      case 'TOURNAMENT_COMPLETED':
        return `toqueplay://tournament/${referenceId}`;
      case 'MATCH':
      case 'MATCH_START':
      case 'MATCH_FINISH':
      case 'MATCH_SET':
        return `toqueplay://match/${referenceId}`;
      case 'CHAT':
      case 'CHAT_MESSAGE':
        return `toqueplay://chat/${referenceId}`;
      case 'FRIENDLY':
      case 'FRIENDLY_REJECTED':
        return `toqueplay://friendly/${referenceId}`;
      case 'TEAM_INVITE':
        return `toqueplay://team-invitation/${referenceId}`;
      default:
        return '';
    }
  }

  private mapTypeToCategory(type: string): string {
    switch (type) {
      case 'CHAT':
      case 'CHAT_MESSAGE':
        return 'messages';
      case 'INVITE':
      case 'TEAM_INVITE':
        return 'invites';
      case 'MATCH':
      case 'MATCH_START':
      case 'MATCH_FINISH':
      case 'MATCH_SET':
        return 'matches';
      case 'FRIENDLY':
      case 'FRIENDLY_REJECTED':
        return 'friendlies';
      case 'TOURNAMENT':
      case 'BRACKET_GENERATED':
      case 'REGISTRATION':
      case 'REGISTRATION_CONFIRMED':
      case 'TOURNAMENT_STARTED':
      case 'TOURNAMENT_COMPLETED':
        return 'tournaments';
      default:
        return 'tournaments';
    }
  }

  private async filterByPreference(userIds: string[], category: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, notificationPreferences: true },
    });

    const DEFAULT_PREFS: Record<string, boolean> = { messages: true, invites: true, matches: true, friendlies: true, tournaments: true };

    return users
      .filter((u) => {
        const prefs: Record<string, boolean> = { ...DEFAULT_PREFS, ...(u.notificationPreferences as Record<string, boolean> || {}) };
        return prefs[category] !== false;
      })
      .map((u) => u.id);
  }
}
