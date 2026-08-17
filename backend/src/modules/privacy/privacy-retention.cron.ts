import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const BOOT_DELAY_MS = 10 * 60 * 1000; // 10min after boot
const BATCH_SIZE = 5000; // rows per deleteMany chunk
const BATCH_SLEEP_MS = 200; // throttle between chunks to avoid DB lock

// Retention windows (days). Aligned with privacy-policy.md §6.
const NOTIFICATION_RETENTION_DAYS = 180;
const DEVICE_TOKEN_RETENTION_DAYS = 90;
const CHAT_MESSAGE_RETENTION_DAYS = 24 * 30; // ~24 months
const AUDIT_LOG_RETENTION_DAYS = 24 * 30; // ~24 months
const MATCH_EVENT_RETENTION_DAYS = 60 * 30; // ~5 years (PointEvent, MatchEvent)

/**
 * LGPD-aligned retention: prune stale records per documented policy.
 * Notification >180d, EmailVerification expired, DeviceToken >90d,
 * RefreshToken expired, ChatMessage >24 months, AuditLog >24 months,
 * PointEvent/MatchEvent >5 years.
 *
 * Not purged (retention by legal obligation, no auto-purge):
 * - DataSubjectRequest (5y fiscal/compliance).
 * - SecurityIncident (5y compliance).
 * - Registration/payment records (5y fiscal).
 *
 * Deletes are chunked in batches of BATCH_SIZE with short sleep between
 * chunks to avoid long table locks on the first sweep against large tables
 * (AuditLog, MatchEvent can have millions of rows in prod).
 */
@Injectable()
export class PrivacyRetentionCron implements OnModuleInit {
  private readonly logger = new Logger(PrivacyRetentionCron.name);
  private bootTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // First sweep 10min after boot (lets the app settle), then daily.
    this.bootTimer = setTimeout(() => {
      this.bootTimer = null;
      this.run()
        .catch((err) => this.logger.warn(`retention boot run failed: ${(err as Error).message}`));
      this.intervalTimer = setInterval(() => {
        this.run()
          .catch((err) => this.logger.warn(`retention failed: ${(err as Error).message}`));
      }, RETENTION_INTERVAL_MS);
      this.intervalTimer.unref?.();
    }, BOOT_DELAY_MS);
    this.bootTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Chunked delete via findMany + deleteMany by id. Prisma 5 deleteMany
   * does not support `take`, so we page by id list. Returns total rows
   * deleted across all chunks. Loops until a batch returns fewer than
   * BATCH_SIZE rows (meaning the backlog is drained). Capped at
   * MAX_ITERATIONS to guard against runaway loops.
   */
  private async deleteInBatches(
    model: 'notification' | 'emailVerification' | 'deviceToken' | 'refreshToken' | 'chatMessage' | 'auditLog' | 'pointEvent' | 'matchEvent',
    where: object,
  ): Promise<number> {
    const idField = 'id';
    let total = 0;
    const MAX_ITERATIONS = 200;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // @ts-expect-error — dynamic model accessor; types are correct at runtime
      const rows: Array<{ id: string }> = await this.prisma[model].findMany({
        where,
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (rows.length === 0) break;
      const ids = rows.map((r) => r.id);
      // @ts-expect-error — dynamic model accessor
      const res = await this.prisma[model].deleteMany({
        where: { [idField]: { in: ids } },
      });
      total += res.count;
      if (rows.length < BATCH_SIZE) break;
      await this.sleep(BATCH_SLEEP_MS);
    }
    return total;
  }

  async run(): Promise<void> {
    const now = new Date();

    const notifCutoff = new Date(now);
    notifCutoff.setDate(notifCutoff.getDate() - NOTIFICATION_RETENTION_DAYS);
    const notifCount = await this.deleteInBatches('notification', { createdAt: { lt: notifCutoff } });

    const verifCount = await this.deleteInBatches('emailVerification', { expiresAt: { lt: now } });

    const tokenCutoff = new Date(now);
    tokenCutoff.setDate(tokenCutoff.getDate() - DEVICE_TOKEN_RETENTION_DAYS);
    const tokenCount = await this.deleteInBatches('deviceToken', { createdAt: { lt: tokenCutoff } });

    const refreshCount = await this.deleteInBatches('refreshToken', { expiresAt: { lt: now } });

    const chatCutoff = new Date(now);
    chatCutoff.setDate(chatCutoff.getDate() - CHAT_MESSAGE_RETENTION_DAYS);
    const chatCount = await this.deleteInBatches('chatMessage', { createdAt: { lt: chatCutoff } });

    const auditCutoff = new Date(now);
    auditCutoff.setDate(auditCutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);
    const auditCount = await this.deleteInBatches('auditLog', { createdAt: { lt: auditCutoff } });

    const matchEventCutoff = new Date(now);
    matchEventCutoff.setDate(matchEventCutoff.getDate() - MATCH_EVENT_RETENTION_DAYS);
    const pointEventCount = await this.deleteInBatches('pointEvent', { timestamp: { lt: matchEventCutoff } });
    const matchEventCount = await this.deleteInBatches('matchEvent', { createdAt: { lt: matchEventCutoff } });

    this.logger.log(
      `retention sweep: notifications=${notifCount} emailVerifications=${verifCount} deviceTokens=${tokenCount} refreshTokens=${refreshCount} chatMessages=${chatCount} auditLogs=${auditCount} pointEvents=${pointEventCount} matchEvents=${matchEventCount}`,
    );
  }
}
