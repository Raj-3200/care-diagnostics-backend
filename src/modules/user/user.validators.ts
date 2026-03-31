import { z } from 'zod';
import { Role } from '@prisma/client';
import { CONSTANTS } from '../../config/constants.js';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(CONSTANTS.PASSWORD.MIN_LENGTH, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Invalid role' }) }),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits').optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Invalid role' }) }).optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits').optional(),
  isActive: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().min(1, 'Page must be at least 1')),
  limit: z
    .string()
    .optional()
    .default('30')
    .transform(Number)
    .pipe(
      z
        .number()
        .min(1, 'Limit must be at least 1')
        .max(
          CONSTANTS.PAGINATION.MAX_LIMIT,
          `Limit cannot exceed ${CONSTANTS.PAGINATION.MAX_LIMIT}`,
        ),
    ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
