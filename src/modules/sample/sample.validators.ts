import { z } from 'zod';
import { SampleStatus, SampleType } from '@prisma/client';

export const createSampleSchema = z.object({
  testOrderId: z.string().uuid('Invalid test order ID'),
  barcode: z.string().min(1, 'Barcode is required').max(100),
  sampleType: z.nativeEnum(SampleType),
  notes: z.string().max(500).optional().nullable(),
});

export const recordSampleCollectionSchema = z.object({
  collectedById: z.string().uuid('Invalid user ID'),
  collectedAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  notes: z.string().max(500).optional().nullable(),
});

export const rejectSampleSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(500),
  notes: z.string().max(500).optional().nullable(),
});

export const updateSampleStatusSchema = z.object({
  status: z.nativeEnum(SampleStatus),
});

export const sampleListSchema = z.object({
  status: z.nativeEnum(SampleStatus).optional(),
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

/** Quick-collect: create + collect from just testOrderId */
export const quickCollectSchema = z.object({
  testOrderId: z.string().uuid('Invalid test order ID'),
});

export type CreateSampleInput = z.infer<typeof createSampleSchema>;
export type RecordSampleCollectionInput = z.infer<typeof recordSampleCollectionSchema>;
export type RejectSampleInput = z.infer<typeof rejectSampleSchema>;
export type UpdateSampleStatusInput = z.infer<typeof updateSampleStatusSchema>;
export type QuickCollectInput = z.infer<typeof quickCollectSchema>;
