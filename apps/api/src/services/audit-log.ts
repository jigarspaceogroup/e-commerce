import { prisma } from "../lib/prisma.js";

export interface AuditLogInput {
  actorId: string;
  actorIp: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  notes?: string;
}

export async function recordAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorIp: input.actorIp,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeValue: input.beforeValue ? JSON.parse(JSON.stringify(input.beforeValue)) : undefined,
      afterValue: input.afterValue ? JSON.parse(JSON.stringify(input.afterValue)) : undefined,
      notes: input.notes,
    },
  });
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function queryAuditLogs(
  filters: AuditLogFilters,
  cursor?: string,
  limit = 20,
) {
  const where: Record<string, unknown> = {};
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

  const hasMore = logs.length > limit;
  const data = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}
