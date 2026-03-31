import { Request } from 'express';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}
