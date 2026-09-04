import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma.service';
import { MailService } from '../../modules/mail/mail.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly expo = new Expo();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  async sendToUsers(userIds: string[], payload: { title: string; body: string; type: string; referenceId?: string }) {
    const category = this.mapTypeToCategory(payload.type);

    // Filter users by per-category notification preference, then by the
    // user's actual push consent (LGPD opt-in) — the Settings "Notificações
    // push" toggle. Both must hold: category-relevant AND explicitly opted in.
    const categoryEligibleUserIds = await this.filterByPreference(userIds, category);
    const pushConsentUserIds = await this.filterByConsent(categoryEligibleUserIds, 'NOTIFICATIONS_PUSH');

    // Save in-app notifications for all users (regardless of push preference)
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.createNotification(userId, payload.title, payload.body, payload.type, payload.referenceId),
      ),
    );

    // Send push only to users who opted in
    if (pushConsentUserIds.length > 0) {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: { in: pushConsentUserIds } },
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

    // Email — separate opt-in (MARKETING_EMAIL consent), best-effort/non-blocking.
    // Verification/password-reset/DPO emails never go through this path — they're
    // sent directly by their own services regardless of this consent.
    this.sendEmailNotifications(userIds, payload).catch((error) =>
      this.logger.warn(`Notification email batch failed: ${(error as Error).message}`),
    );

    return notifications;
  }

  private async sendEmailNotifications(userIds: string[], payload: { title: string; body: string }) {
    const consentedUserIds = await this.filterByConsent(userIds, 'MARKETING_EMAIL');
    if (consentedUserIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: consentedUserIds } },
      select: { email: true, name: true },
    });

    await Promise.all(
      users.map((u: { email: string; name: string }) =>
        this.mailService
          .sendNotificationEmail(u.email, u.name, payload)
          .catch((error) => this.logger.warn(`Notification email to ${u.email} failed: ${(error as Error).message}`)),
      ),
    );
  }

  /**
   * Latest LGPD consent per user for a given purpose (NOTIFICATIONS_PUSH /
   * MARKETING_EMAIL), scoped to the current terms version — mirrors
   * PrivacyService.getConsents. Defaults to false (opt-in required): a user
   * who never touched the toggle has not consented.
   */
  private async filterByConsent(userIds: string[], purpose: 'NOTIFICATIONS_PUSH' | 'MARKETING_EMAIL'): Promise<string[]> {
    if (userIds.length === 0) return [];
    const version = this.config.get<string>('TERMS_VERSION') ?? 'v1';
    const rows = await this.prisma.userConsent.findMany({
      where: { userId: { in: userIds }, purpose, version },
      orderBy: { createdAt: 'desc' },
      select: { userId: true, accepted: true },
    });

    const latestByUser = new Map<string, boolean>();
    for (const r of rows as Array<{ userId: string; accepted: boolean }>) {
      if (!latestByUser.has(r.userId)) latestByUser.set(r.userId, r.accepted);
    }

    return userIds.filter((id) => latestByUser.get(id) === true);
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
    // Expo's push service relays to FCM/APNs on our behalf — no Firebase
    // project or Apple credentials needed for it to work on Android.
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      data: {
        type: payload.type,
        ...(payload.referenceId && { referenceId: payload.referenceId }),
        ...(deepLink && { deepLink }),
      },
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.warn(`Expo push ticket error: ${ticket.message}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Expo push send failed: ${(error as Error).message}`);
      }
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
