import { Request, Response, NextFunction } from 'express';

export const healthCheck = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  res.status(200).json({
    status: 'ok',
    service: 'care-diagnostics-api',
    timestamp: new Date().toISOString(),
  });
};
