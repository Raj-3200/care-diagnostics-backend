import { Response, NextFunction } from 'express';
import { sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { listAuditLogs } from './audit.service.js';
import type { AuditLogListQuery } from './audit.validators.js';

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as AuditLogListQuery;
    const page = query.page;
    const limit = query.limit;

    const { logs, total } = await listAuditLogs({
      page,
      limit,
      tenantId: req.user!.tenantId,
      action: query.action,
      entity: query.entity,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    sendPaginated(res, logs, page, limit, total);
  } catch (error) {
    next(error);
  }
};
