import { z } from 'zod';
import { CONSTANTS } from '../../config/constants.js';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(CONSTANTS.PASSWORD.MIN_LENGTH, 'Password must be at least 8 characters'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
