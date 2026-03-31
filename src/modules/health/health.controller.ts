import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { prisma } from '../../config/database.js';

export const healthCheck = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const databaseStatus = 'connected';

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: databaseStatus,
      version: '1.0.0',
    };

    sendSuccess(res, healthData, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
