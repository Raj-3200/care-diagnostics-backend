import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { prisma } from '../../config/database.js';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const unreadOnly = req.query.unreadOnly === 'true';

    const where = {
      tenantId,
      OR: [{ userId }, { userId: null }], // personal + broadcast
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    sendPaginated(res, items, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: {
        tenantId: req.user!.tenantId,
        OR: [{ userId: req.user!.userId }, { userId: null }],
        isRead: false,
      },
    });

    sendSuccess(res, { count }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    sendSuccess(res, { message: 'Marked as read' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: {
        tenantId: req.user!.tenantId,
        OR: [{ userId: req.user!.userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    sendSuccess(res, { message: 'All notifications marked as read' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
