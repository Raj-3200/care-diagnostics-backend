import { z } from 'zod';
import { VisitStatus } from '@prisma/client';

export const createVisitSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateVisitSchema = z.object({
  status: z.nativeEnum(VisitStatus).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const getVisitsByPatientSchema = z.object({
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
    .pipe(z.number().min(1).max(100)),
});

export const getAllVisitsSchema = z.object({
  status: z.nativeEnum(VisitStatus).optional(),
  patientId: z.string().uuid().optional(),
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

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
