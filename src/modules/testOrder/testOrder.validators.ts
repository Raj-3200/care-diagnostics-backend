import { z } from 'zod';

export const createTestOrderSchema = z.object({
  visitId: z.string().uuid('Invalid visit ID'),
  testId: z.string().uuid('Invalid test ID'),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  notes: z.string().max(500).optional().nullable(),
});

export const updateTestOrderSchema = z.object({
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const bulkCreateTestOrderSchema = z.array(
  z.object({
    testId: z.string().uuid('Invalid test ID'),
    priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
    notes: z.string().max(500).optional().nullable(),
  })
);

/** Schema for frontend bulk create: { visitId, testIds } */
export const bulkCreateByIdsSchema = z.object({
  visitId: z.string().uuid('Invalid visit ID'),
  testIds: z.array(z.string().uuid('Invalid test ID')).min(1, 'At least one test is required'),
});

export type CreateTestOrderInput = z.infer<typeof createTestOrderSchema>;
export type UpdateTestOrderInput = z.infer<typeof updateTestOrderSchema>;
export type BulkCreateTestOrderInput = z.infer<typeof bulkCreateTestOrderSchema>;
export type BulkCreateByIdsInput = z.infer<typeof bulkCreateByIdsSchema>;
