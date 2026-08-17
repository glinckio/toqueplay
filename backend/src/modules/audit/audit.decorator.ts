import { SetMetadata } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export const AUDIT_METADATA_KEY = 'audit:metadata';
export const AUDIT_READ_METADATA_KEY = 'audit:read';

export interface AuditMeta {
  action: string;
  entityType: string;
  entityIdParam?: string;
  fetchBefore?: (
    prisma: PrismaService,
    entityId: string,
    request: any,
  ) => Promise<any>;
}

export function Audit(
  action: string,
  entityType: string,
  opts?: Omit<AuditMeta, 'action' | 'entityType'>,
): MethodDecorator {
  return SetMetadata(AUDIT_METADATA_KEY, {
    action,
    entityType,
    entityIdParam: opts?.entityIdParam ?? 'id',
    fetchBefore: opts?.fetchBefore,
  } satisfies AuditMeta);
}

/**
 * Marks a READ endpoint (GET) that accesses sensitive/PII data so the audit
 * interceptor logs the access. Use on /admin/users/:id, /admin/athletes, etc.
 */
export function AuditRead(
  action: string,
  entityType: string,
  opts?: { entityIdParam?: string },
): MethodDecorator {
  return SetMetadata(AUDIT_READ_METADATA_KEY, {
    action,
    entityType,
    entityIdParam: opts?.entityIdParam ?? 'id',
  });
}
