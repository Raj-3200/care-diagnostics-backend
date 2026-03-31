import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as authService from './auth.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from '../../shared/utils/jwt.js';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as { email: string; password: string };
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await authService.login(body.email, body.password, ipAddress, userAgent);

    // Set httpOnly cookies for secure token storage
    res.cookie('accessToken', result.tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Also return tokens in response body for API clients
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Accept from cookie or body
    const token = req.cookies?.refreshToken || (req.body as { refreshToken?: string }).refreshToken;
    if (!token) {
      throw new Error('Refresh token required');
    }

    const result = await authService.refreshToken(token);

    // Update cookies
    res.cookie('accessToken', result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    await authService.logout(token, req.user?.userId);

    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    sendSuccess(res, { message: 'Logged out successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

export const me = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const user = await authService.getProfile(req.user.userId);
    sendSuccess(res, user, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
