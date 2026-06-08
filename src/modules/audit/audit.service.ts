import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';

interface ListAuditLogsFilters {
  page: number;
  limit: number;
  tenantId: string;
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listAuditLogs(filters: ListAuditLogsFilters) {
  const where: Prisma.AuditLogWhereInput = {
    user: { tenantId: filters.tenantId },
  };

  if (filters.action) {
    where.action = { contains: filters.action, mode: 'insensitive' };
  }

  if (filters.entity) {
    where.entity = { contains: filters.entity, mode: 'insensitive' };
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: filters.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
