import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { AppError } from '../../common/errors/app-error';
import { CreateSecurityIncidentDto, UpdateSecurityIncidentDto } from './dto/dpo.dto';
import * as crypto from 'crypto';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);
  private static readonly EXPORT_RATE_KEY = (userId: string) =>
    `lgpd:export:cooldown:${userId}`;
  private static readonly EXPORT_COOLDOWN_SEC = 24 * 60 * 60; // 1/day

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private auditService: AuditService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  /**
   * LGPD art. 18, V — acesso/portabilidade: returns all data we hold about the user.
   * Cooldown 1/day to avoid abuse.
   */
  async exportUserData(userId: string, requester: { email: string; ip?: string | null; userAgent?: string | null }) {
    const cooldownKey = PrivacyService.EXPORT_RATE_KEY(userId);
    const first = await this.redisService.setNx(
      cooldownKey,
      '1',
      PrivacyService.EXPORT_COOLDOWN_SEC,
    );
    if (!first) {
      throw AppError.dataExportRateLimited();
    }

    const [user, teamMembers, registrations, friendlies, notifications, chatMessages, auditLogs, consents] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, role: true, status: true,
          phone: true, bio: true, avatarUrl: true, isEmailVerified: true,
          createdAt: true, updatedAt: true, latitude: true, longitude: true,
          notificationPreferences: true,
        },
      }),
      this.prisma.teamMember.findMany({
        where: { userId },
        include: { team: { select: { id: true, name: true } } },
      }),
      this.prisma.registration.findMany({
        where: { userId },
        include: {
          tournament: { select: { id: true, name: true } },
          category: { select: { id: true, type: true, format: true, modality: true } },
          team: { select: { id: true, name: true } },
        },
      }),
      this.prisma.friendly.findMany({
        where: { requesterId: userId },
        select: { id: true, status: true, date: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.chatMessage.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.auditLog.findMany({
        where: { actorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.userConsent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    void this.auditService.log({
      action: 'USER_DATA_EXPORTED',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
      actorEmail: requester.email,
      ipAddress: requester.ip ?? null,
      userAgent: requester.userAgent ?? null,
      newValues: { summary: 'full export generated' },
    });

    return {
      generatedAt: new Date().toISOString(),
      user,
      consents,
      teamMembers,
      registrations,
      friendliesRequested: friendlies,
      notifications,
      chatMessages,
      auditLogs,
    };
  }

  /**
   * LGPD art. 18, VI — eliminação: anonymize user. Financial records kept 5y (art. 16 II).
   */
  async deleteAccount(
    userId: string,
    confirmation: { email: string; expectedEmail: string },
    ctx?: { ip?: string | null; userAgent?: string | null },
  ) {
    if (confirmation.email !== confirmation.expectedEmail) {
      throw AppError.accountDeletionConfirmationRequired();
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.userNotFound();
    }

    const anonId = crypto.randomUUID();
    const anonymousEmail = `deleted+${anonId}@toqueplay.local`;

    // Anonymize PII but keep row for financial/legal referential integrity.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email: anonymousEmail,
        password: null,
        googleId: null,
        phone: null,
        bio: null,
        avatarUrl: null,
        latitude: null,
        longitude: null,
        status: 'BLOCKED',
        notificationPreferences: { disabled: true },
      },
    });

    // Revoke all sessions.
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.deviceToken.deleteMany({ where: { userId } });

    // Soft-delete chat messages authored by user (replace content with tombstone).
    await this.prisma.chatMessage.updateMany({
      where: { senderId: userId },
      data: { content: '[mensagem removida — conta excluída]' },
    });

    void this.auditService.log({
      action: 'USER_ACCOUNT_DELETED',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
      actorEmail: anonymousEmail,
      ipAddress: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
      oldValues: { email: user.email, name: user.name },
      newValues: { email: anonymousEmail, anonymizedAt: new Date().toISOString() },
    });

    this.logger.log(`user ${userId} anonymized (financial records retained for legal compliance)`);

    return { message: 'Conta excluída e dados anonimizados.' };
  }

  /**
   * LGPD art. 18, I — confirmação: summary counts per entity.
   */
  async getDataSummary(userId: string) {
    const [teams, registrations, friendlies, notifications, chatMessages, consents] = await Promise.all([
      this.prisma.teamMember.count({ where: { userId } }),
      this.prisma.registration.count({ where: { userId } }),
      this.prisma.friendly.count({ where: { requesterId: userId } }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.chatMessage.count({ where: { senderId: userId } }),
      this.prisma.userConsent.count({ where: { userId } }),
    ]);

    return {
      userId,
      teams,
      registrations,
      friendliesRequested: friendlies,
      notifications,
      chatMessages,
      consents,
    };
  }

  /**
   * Returns current consent state + active Terms version. App compares with
   * locally stored version to decide whether to re-prompt the user.
   */
  async getConsents(userId: string) {
    const version = this.configService.get<string>('TERMS_VERSION') ?? 'v1';
    const rows = await this.prisma.userConsent.findMany({
      where: { userId, version },
      orderBy: { createdAt: 'desc' },
    });

    // dedupe by purpose (most recent wins)
    const byPurpose = new Map<string, boolean>();
    for (const r of rows) {
      byPurpose.set(r.purpose, r.accepted);
    }

    const hasTerms = await this.prisma.userConsent.findFirst({
      where: { userId, purpose: 'TERMS' },
      orderBy: { createdAt: 'desc' },
    });

    const lastAcceptedVersion = hasTerms?.version ?? null;
    const termsOutdated =
      !hasTerms || lastAcceptedVersion !== version;

    return {
      version,
      lastAcceptedAt: hasTerms?.createdAt ?? null,
      lastAcceptedVersion,
      termsOutdated,
      consents: {
        terms: byPurpose.get('TERMS') ?? false,
        notificationsPush: byPurpose.get('NOTIFICATIONS_PUSH') ?? false,
        locationDiscovery: byPurpose.get('LOCATION_DISCOVERY') ?? false,
        marketingEmail: byPurpose.get('MARKETING_EMAIL') ?? false,
      },
    };
  }

  async updateConsents(
    userId: string,
    dto: { notificationsPush?: boolean; locationDiscovery?: boolean; marketingEmail?: boolean },
    requester: { email: string; ip?: string | null; userAgent?: string | null },
  ) {
    const version = this.configService.get<string>('TERMS_VERSION') ?? 'v1';
    const base = {
      userId,
      version,
      ipAddress: requester.ip ?? null,
      userAgent: requester.userAgent ?? null,
    };

    const records: Array<{
      userId: string;
      version: string;
      purpose: any;
      accepted: boolean;
      ipAddress: string | null;
      userAgent: string | null;
    }> = [];

    if (dto.notificationsPush !== undefined) {
      records.push({ ...base, purpose: 'NOTIFICATIONS_PUSH', accepted: dto.notificationsPush });
    }
    if (dto.locationDiscovery !== undefined) {
      records.push({ ...base, purpose: 'LOCATION_DISCOVERY', accepted: dto.locationDiscovery });
    }
    if (dto.marketingEmail !== undefined) {
      records.push({ ...base, purpose: 'MARKETING_EMAIL', accepted: dto.marketingEmail });
    }

    if (records.length > 0) {
      await this.prisma.userConsent.createMany({ data: records });
    }

    void this.auditService.log({
      action: 'USER_CONSENTS_UPDATED',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
      actorEmail: requester.email,
      ipAddress: requester.ip ?? null,
      userAgent: requester.userAgent ?? null,
      newValues: dto,
    });

    return this.getConsents(userId);
  }

  /**
   * Records a fresh TERMS acceptance at the current TERMS_VERSION. Used by
   * the boot/login intercept when the active version differs from what the
   * user previously accepted (LGPD art. 8 — consent must be specific and
   * informed; material changes require fresh acceptance).
   */
  async acceptCurrentTerms(
    userId: string,
    requester: { email: string; ip?: string | null; userAgent?: string | null },
  ) {
    const version = this.configService.get<string>('TERMS_VERSION') ?? 'v1';

    await this.prisma.userConsent.create({
      data: {
        userId,
        version,
        purpose: 'TERMS',
        accepted: true,
        ipAddress: requester.ip ?? null,
        userAgent: requester.userAgent ?? null,
      },
    });

    void this.auditService.log({
      action: 'USER_TERMS_ACCEPTED',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
      actorEmail: requester.email,
      ipAddress: requester.ip ?? null,
      userAgent: requester.userAgent ?? null,
      newValues: { version },
    });

    return this.getConsents(userId);
  }

  // ─── DPO Channel ──────────────────────────────────────────

  async createDpoRequest(
    dto: {
      type: string;
      subject: string;
      message: string;
      email?: string;
    },
    userId?: string,
  ) {
    const email = dto.email ?? null;
    if (!userId && !email) {
      throw AppError.accountDeletionConfirmationRequired();
    }

    const created = await this.prisma.dataSubjectRequest.create({
      data: {
        userId: userId ?? null,
        email: email ?? 'anonymous@toqueplay.local',
        type: dto.type as any,
        subject: dto.subject,
        message: dto.message,
      },
    });

    void this.auditService.log({
      action: 'DPO_REQUEST_CREATED',
      entityType: 'DataSubjectRequest',
      entityId: created.id,
      actorId: userId ?? null,
      actorEmail: email ?? null,
      newValues: { type: dto.type, subject: dto.subject },
    });

    // Alert the DPO operator (LGPD art. 19 — 15-day response window).
    void this.mailService
      .sendDpoNotifyEmail({
        ref: created.id,
        type: dto.type,
        subject: dto.subject,
        email: created.email,
      })
      .catch((err) =>
        this.logger.warn(`DPO notify failed: ${(err as Error).message}`),
      );

    return created;
  }

  async listDpoRequests(opts: { page?: number; limit?: number; status?: string }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (opts.status) where.status = opts.status;

    const [data, total] = await Promise.all([
      this.prisma.dataSubjectRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dataSubjectRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateDpoRequestStatus(id: string, status: string, reviewerId: string) {
    const existing = await this.prisma.dataSubjectRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const updated = await this.prisma.dataSubjectRequest.update({
      where: { id },
      data: { status: status as any },
    });

    void this.auditService.log({
      action: 'DPO_REQUEST_UPDATED',
      entityType: 'DataSubjectRequest',
      entityId: id,
      actorId: reviewerId,
      newValues: { status },
    });

    // LGPD art. 18/19 — reply to the holder when their request is concluded.
    if (
      (status === 'RESOLVED' || status === 'REJECTED') &&
      status !== existing.status
    ) {
      void this.mailService
        .sendDpoResponseEmail(existing.email, {
          type: existing.type,
          status,
          subject: existing.subject,
        })
        .catch((err) =>
          this.logger.warn(`DPO response failed: ${(err as Error).message}`),
        );
    }

    return updated;
  }

  // ─── Security Incidents ────────────────────────────────────

  async createSecurityIncident(dto: CreateSecurityIncidentDto) {
    const incident = await this.prisma.securityIncident.create({
      data: {
        type: dto.type,
        severity: dto.severity,
        affectedUsers: dto.affectedUsers,
        description: dto.description,
        detectedBy: dto.detectedBy,
        affectedDataCategories: dto.affectedDataCategories ?? [],
        rootCause: dto.rootCause,
        containmentMeasures: dto.containmentMeasures,
        notes: dto.notes ?? null,
      },
    });

    void this.auditService.log({
      action: 'SECURITY_INCIDENT_REPORTED',
      entityType: 'SecurityIncident',
      entityId: incident.id,
      newValues: {
        type: dto.type,
        severity: dto.severity,
        affectedUsers: dto.affectedUsers,
        affectedDataCategories: dto.affectedDataCategories ?? [],
      },
    });

    // HIGH/CRITICAL with affected users = escalation trigger
    if (
      (dto.severity === 'HIGH' || dto.severity === 'CRITICAL') &&
      dto.affectedUsers > 0
    ) {
      this.logger.warn(
        `SECURITY INCIDENT ESCALATION id=${incident.id} severity=${dto.severity} affectedUsers=${dto.affectedUsers} — ANPD notification required within 2 business days (LGPD art. 48).`,
      );
    }

    return incident;
  }

  async updateSecurityIncident(id: string, dto: UpdateSecurityIncidentDto, userId: string) {
    const existing = await this.prisma.securityIncident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Incidente não encontrado');
    }

    // Partial update: only fields actually present in the payload.
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) data[k] = v;
    }

    // Derived timestamps for the LGPD art. 48 lifecycle.
    if (dto.status === 'RESOLVED' && !existing.resolvedAt) {
      data.resolvedAt = new Date();
    }
    if (dto.anpdNotified === true && !existing.anpdNotifiedAt) {
      data.anpdNotifiedAt = new Date();
    }

    const updated = await this.prisma.securityIncident.update({
      where: { id },
      data,
    });

    const statusChanged = dto.status !== undefined && dto.status !== existing.status;
    void this.auditService.log({
      action: statusChanged ? 'SECURITY_INCIDENT_STATUS_CHANGED' : 'SECURITY_INCIDENT_UPDATED',
      entityType: 'SecurityIncident',
      entityId: id,
      actorId: userId,
      oldValues: statusChanged ? { status: existing.status } : undefined,
      newValues: statusChanged ? { status: updated.status } : data,
    });

    return updated;
  }

  async listSecurityIncidents(opts: { page?: number; limit?: number; status?: string }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (opts.status) where.status = opts.status;

    const [data, total] = await Promise.all([
      this.prisma.securityIncident.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.securityIncident.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
