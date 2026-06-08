import { z } from 'zod';

const dateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

export const auditLogListSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().default('30').transform(Number).pipe(z.number().min(1).max(100)),
  action: z.string().trim().min(1).optional(),
  entity: z.string().trim().min(1).optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});

export type AuditLogListQuery = z.infer<typeof auditLogListSchema>;
