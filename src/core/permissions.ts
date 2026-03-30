/**
 * Permission-based access control.
 * Checks that the user's role (in their tenant) has the required permission code.
 * Falls back to role-based check for backward compatibility.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/auth.types.js';
import { ForbiddenError } from '../shared/errors/AppError.js';
import { prisma } from '../config/database.js';

// In-memory permission cache per tenant+role (refreshed every 5 min)
const permissionCache = new Map<string, { codes: Set<string>; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getPermissions(role: string, tenantId: string): Promise<Set<string>> {
  const cacheKey = `${tenantId}:${role}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.codes;
  }

  const rps = await prisma.rolePermission.findMany({
    where: { role, tenantId },
    include: { permission: { select: { code: true } } },
  });

  const codes = new Set(rps.map((rp) => rp.permission.code));
  permissionCache.set(cacheKey, { codes, cachedAt: Date.now() });
  return codes;
}

/**
 * Middleware: require one or more permission codes.
 * Usage: requirePermission('result.verify', 'result.reject')
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not authenticated');
      }

      // ADMIN bypass — admins always have full access
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const tenantId = req.user.tenantId;
      if (!tenantId) {
        throw new ForbiddenError('Tenant context required');
      }

      const userPermissions = await getPermissions(req.user.role, tenantId);
      const hasPermission = requiredPermissions.some((p) => userPermissions.has(p));

      if (!hasPermission) {
        throw new ForbiddenError(`Missing permission: ${requiredPermissions.join(' or ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/** Clear permission cache (e.g., after role-permission update) */
export function clearPermissionCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of permissionCache.keys()) {
      if (key.startsWith(tenantId)) {
        permissionCache.delete(key);
      }
    }
  } else {
    permissionCache.clear();
  }
}
