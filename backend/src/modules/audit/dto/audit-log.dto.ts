export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  route: string | null;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface PaginatedAuditLogs {
  data: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
