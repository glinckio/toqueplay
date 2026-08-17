import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, from, tap } from 'rxjs';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from './audit.service';
import {
  AUDIT_METADATA_KEY,
  AUDIT_READ_METADATA_KEY,
  AuditMeta,
} from './audit.decorator';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// keys stripped from newValues payloads to avoid huge logs / sensitive data
const STRIP_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) {
    return value.length > 50 ? `[array:${value.length}]` : value.map((v) => sanitize(v, depth + 1));
  }
  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) return '[buffer]';
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = k.toLowerCase();
      if (STRIP_KEYS.has(keyLower)) {
        out[k] = '[redacted]';
        continue;
      }
      out[k] = sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

function extractIp(req: Request): string | null {
  const xff = (req.headers['x-forwarded-for'] as string | undefined) ?? null;
  if (xff) return xff.split(',')[0].trim();
  return (req as any).ip ?? (req.socket?.remoteAddress ?? null);
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();

    // READ audit path: only intercepts when handler is decorated with @AuditRead.
    if (!MUTATION_METHODS.has(method)) {
      const readMeta = this.reflector.get<{
        action: string;
        entityType: string;
        entityIdParam?: string;
      } | undefined>(AUDIT_READ_METADATA_KEY, context.getHandler());

      if (!readMeta) {
        return next.handle();
      }

      const user0 = (req as any).user ?? null;
      const route = (req as any).route?.path ?? req.url;
      const entityId = readMeta.entityIdParam
        ? ((req.params as any)?.[readMeta.entityIdParam] ?? null)
        : null;

      return next.handle().pipe(
        tap(() => {
          const res = context.switchToHttp().getResponse();
          const statusCode: number = res?.statusCode ?? 200;
          if (statusCode >= 400) return;

          from(
            this.auditService.log({
              action: readMeta.action,
              entityType: readMeta.entityType,
              entityId: entityId != null ? String(entityId) : null,
              actorId: user0?.id ?? null,
              actorEmail: user0?.email ?? null,
              actorRole: user0?.role ?? null,
              ipAddress: extractIp(req),
              userAgent: req.headers['user-agent'] ?? null,
              method,
              route,
            }),
          ).subscribe({
            error: (err) =>
              this.logger.warn(`audit read pipe failed: ${(err as Error).message}`),
          });
        }),
      );
    }

    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    // skip explicit opt-out
    if (meta === null) return next.handle();

    let oldValues: unknown = undefined;
    const entityIdFromParam = meta?.entityIdParam ? (req.params as any)?.[meta.entityIdParam] : null;
    const user0 = (req as any).user ?? null;
    const entityIdBefore = entityIdFromParam ?? (user0?.id ?? null);
    if (meta?.fetchBefore && entityIdBefore) {
      try {
        oldValues = await meta.fetchBefore(this.prisma, String(entityIdBefore), req);
      } catch (err) {
        this.logger.warn(`fetchBefore failed: ${(err as Error).message}`);
      }
    }

    return next.handle().pipe(
      tap((returnValue) => {
        const res = context.switchToHttp().getResponse();
        const statusCode: number = res?.statusCode ?? 200;
        if (statusCode >= 400) return;

        const user = user0;

        const entityId =
          entityIdFromParam ??
          (returnValue && typeof returnValue === 'object'
            ? (returnValue as any).id ?? (returnValue as any).data?.id ?? null
            : null) ??
          user?.id ??
          null;

        const route = (req as any).route?.path ?? req.url;
        const action = meta?.action ?? `${method}_${route}`;
        const entityType = meta?.entityType ?? 'Unknown';

        const newValues =
          returnValue !== undefined ? sanitize(returnValue) : req.body ? sanitize(req.body) : null;

        from(
          this.auditService.log({
            action,
            entityType,
            entityId: entityId != null ? String(entityId) : null,
            actorId: user?.id ?? null,
            actorEmail: user?.email ?? null,
            actorRole: user?.role ?? null,
            oldValues: oldValues != null ? sanitize(oldValues) : undefined,
            newValues,
            ipAddress: extractIp(req),
            userAgent: req.headers['user-agent'] ?? null,
            method,
            route,
          }),
        ).subscribe({
          error: (err) =>
            this.logger.warn(`audit pipe failed: ${(err as Error).message}`),
        });
      }),
    );
  }
}
