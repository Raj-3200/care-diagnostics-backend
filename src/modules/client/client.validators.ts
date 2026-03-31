import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const createClientSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone must be 10 digits')
    .optional(),
});

export const updateClientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone must be 10 digits')
    .optional(),
  isActive: z.boolean().optional(),
});

export const uploadReportSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  patientId: z.string().uuid('Invalid patient ID').optional(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
});

export const clientListSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().default('30').transform(Number).pipe(z.number().min(1).max(100)),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type UploadReportInput = z.infer<typeof uploadReportSchema>;
