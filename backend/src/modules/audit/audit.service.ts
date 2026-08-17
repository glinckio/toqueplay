import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  method?: string | null;
  route?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Best-effort write. Never throws to caller.
   */
  log(input: AuditInput): Promise<void> {
    const payload: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      oldValues: (input.oldValues ?? undefined) as any,
      newValues: (input.newValues ?? undefined) as any,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      method: input.method ?? null,
      route: input.route ?? null,
    };
    return this.prisma.auditLog
      .create({ data: payload })
      .catch((err) => {
        this.logger.warn(`audit log write failed: ${(err as Error).message}`);
      })
      .then(() => undefined);
  }

  async cleanup(olderThanDays = 730): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const res = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(`audit cleanup removed ${res.count} rows older than ${olderThanDays}d`);
    return res.count;
  }

  async findMany(query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.actorId) where.actorId = query.actorId;
    if (query.entityId) where.entityId = query.entityId;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { actorEmail: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
