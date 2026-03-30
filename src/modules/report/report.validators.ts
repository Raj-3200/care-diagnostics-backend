import { z } from 'zod';
import { ReportStatus } from '@prisma/client';

export const createReportSchema = z.object({
  visitId: z.string().uuid('Invalid visit ID'),
  notes: z.string().max(2000).optional(),
});

export const generateReportSchema = z.object({
  fileUrl: z.string().url('Invalid file URL').optional(),
  notes: z.string().max(2000).optional(),
});

export const approveReportSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const dispatchReportSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const reportListSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().default('30').transform(Number).pipe(z.number().min(1).max(100)),
  status: z.nativeEnum(ReportStatus).optional(),
  patientId: z.string().uuid('Invalid patient ID').optional(),
});
