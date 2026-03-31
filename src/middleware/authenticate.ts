import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/auth.types.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';
import { verifyAccessToken } from '../shared/utils/jwt.js';

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    // 1. Check httpOnly cookie first (preferred, secure)
    let token: string | undefined = req.cookies?.accessToken;

    // 2. Fallback to Authorization header (for API clients / mobile)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};
