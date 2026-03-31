import { z } from 'zod';
import { TestCategory, SampleType } from '@prisma/client';

export const createTestSchema = z.object({
  code: z.string().min(2, 'Code is required').max(50),
  name: z.string().min(2, 'Name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.nativeEnum(TestCategory),
  sampleType: z.nativeEnum(SampleType),
  price: z.number().positive('Price must be positive'),
  turnaroundTime: z.string().min(1, 'Turnaround time is required'), // e.g., "24 hours"
  department: z.string().max(100).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

export const updateTestSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: z.nativeEnum(TestCategory).optional(),
  sampleType: z.nativeEnum(SampleType).optional(),
  price: z.number().positive().optional(),
  turnaroundTime: z.string().optional(),
  department: z.string().max(100).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const testListSchema = z.object({
  category: z.nativeEnum(TestCategory).optional(),
  isActive: z.union([z.boolean(), z.string()]).optional().transform((val) => {
    if (val === true || val === 'true') return true;
    if (val === false || val === 'false') return false;
    return undefined;
  }),
  searchTerm: z.string().optional(),
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

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type TestListInput = z.infer<typeof testListSchema>;
