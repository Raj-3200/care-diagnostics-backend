import { prisma } from '../../config/database.js';
import { UnauthorizedError, NotFoundError } from '../../shared/errors/AppError.js';
import { comparePassword } from '../../shared/utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt.js';
import { TokenPayload } from '../../shared/types/auth.types.js';
import { CONSTANTS } from '../../config/constants.js';
import crypto from 'crypto';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    isActive: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const login = async (
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<LoginResponse> => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deletedAt) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is inactive');
  }

  // Compare password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Parallelize non-blocking DB writes for speed
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshTokenValue = generateRefreshToken(tokenPayload);
  const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

  // Non-critical writes — fire-and-forget (don't block login response)
  prisma.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch((err) => console.error('[Auth] updateLastLogin failed:', err));
  prisma.auditLog
    .create({
      data: {
        userId: user.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_LOGIN,
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    })
    .catch((err) => console.error('[Auth] auditLog failed:', err));

  // Refresh token MUST be awaited — needed for auth cookie
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceInfo: userAgent?.substring(0, 500),
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
    },
    tokens: {
      accessToken,
      refreshToken: refreshTokenValue,
    },
  };
};

export const refreshToken = async (
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const payload = verifyRefreshToken(token);

  // Verify token hash exists in DB and is not revoked
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!storedToken || storedToken.revokedAt) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.deletedAt || !user.isActive) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Rotate: revoke old token and issue new pair
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  // Store new refresh token
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      deviceInfo: storedToken.deviceInfo,
      ipAddress: storedToken.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logout = async (token?: string, userId?: string): Promise<void> => {
  if (token) {
    // Revoke specific token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else if (userId) {
    // Revoke all tokens for user (logout everywhere)
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};
