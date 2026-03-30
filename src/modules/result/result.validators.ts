import { z } from 'zod';
import { ResultStatus } from '@prisma/client';

export const createResultSchema = z.object({
  testOrderId: z.string().uuid('Invalid test order ID'),
});

export const enterResultSchema = z.object({
  value: z.string().min(1, 'Result value is required').max(500),
  unit: z.string().max(50).optional().nullable(),
  referenceRange: z.string().max(200).optional().nullable(),
  isAbnormal: z.boolean().optional().default(false),
  remarks: z.string().max(1000).optional().nullable(),
});

export const verifyResultSchema = z.object({
  isAbnormal: z.boolean().optional(),
  remarks: z.string().max(1000).optional().nullable(),
});

export const rejectResultSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(500),
});

export const resultListSchema = z.object({
  status: z.nativeEnum(ResultStatus).optional(),
  visitId: z.string().uuid().optional(),
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .default('30')
    .transform(Number)
    .pipe(z.number().min(1).max(100)),
});

export type CreateResultInput = z.infer<typeof createResultSchema>;
export type EnterResultInput = z.infer<typeof enterResultSchema>;
export type VerifyResultInput = z.infer<typeof verifyResultSchema>;
export type RejectResultInput = z.infer<typeof rejectResultSchema>;
