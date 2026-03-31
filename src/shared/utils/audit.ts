/**
 * DRY utility for creating audit log entries.
 * Consolidates repeated audit log creation across all services.
 */

import { prisma } from '../../config/database.js';

export interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      oldValue: (input.oldValue ?? undefined) as undefined,
      newValue: (input.newValue ?? undefined) as undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
