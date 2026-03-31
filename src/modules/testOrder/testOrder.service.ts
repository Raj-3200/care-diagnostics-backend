import * as testOrderRepository from './testOrder.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import {
  CreateTestOrderInput,
  UpdateTestOrderInput,
  BulkCreateTestOrderInput,
} from './testOrder.validators.js';
import { TestOrderWithRelations } from './testOrder.repository.js';
import { env } from '../../config/env.js';

const MAX_SERIALIZABLE_RETRIES = 3;

/**
 * Create a test order for a visit
 * This is the core workflow: receptionist/staff orders tests for a patient's visit
 * Each test order will generate a sample collection task and result entry task
 */
export const createTestOrder = async (
  data: CreateTestOrderInput,
  _createdByUserId: string,
): Promise<TestOrderWithRelations> => {
  // Verify visit exists
  const visit = await prisma.visit.findUnique({
    where: { id: data.visitId, deletedAt: null },
  });

  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  // Verify test exists and is active
  const test = await prisma.test.findUnique({
    where: { id: data.testId, deletedAt: null },
  });

  if (!test) {
    throw new NotFoundError('Test not found');
  }

  if (!test.isActive) {
    throw new ConflictError('Test is inactive and cannot be ordered');
  }

  // Check if this test is already ordered for this visit
  const existingOrder = await prisma.testOrder.findFirst({
    where: { visitId: data.visitId, testId: data.testId, deletedAt: null },
  });

  if (existingOrder) {
    throw new ConflictError('This test is already ordered for this visit');
  }

  try {
    return await testOrderRepository.create({
      ...data,
      tenantId: env.DEFAULT_TENANT_ID,
      notes: data.notes ?? undefined,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('This test is already ordered for this visit');
    }
    throw error;
  }
};

/**
 * Create multiple test orders in one call (bulk order)
 * Receptionist often orders multiple tests in one visit
 */
export const bulkCreateTestOrders = async (
  visitId: string,
  tests: BulkCreateTestOrderInput,
  _createdByUserId: string,
): Promise<TestOrderWithRelations[]> => {
  if (tests.length === 0) {
    return [];
  }

  const uniqueTestIds = new Set<string>();
  for (const test of tests) {
    if (uniqueTestIds.has(test.testId)) {
      throw new ConflictError('Duplicate test IDs found in bulk order request');
    }
    uniqueTestIds.add(test.testId);
  }

  const testIds = Array.from(uniqueTestIds);

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const visit = await tx.visit.findFirst({
            where: { id: visitId, deletedAt: null },
            select: { id: true },
          });

          if (!visit) {
            throw new NotFoundError('Visit not found');
          }

          const testsInCatalog = await tx.test.findMany({
            where: { id: { in: testIds }, deletedAt: null },
            select: { id: true, isActive: true },
          });

          if (testsInCatalog.length !== testIds.length) {
            throw new NotFoundError('One or more tests do not exist');
          }

          const inactiveTest = testsInCatalog.find((test) => !test.isActive);
          if (inactiveTest) {
            throw new ConflictError('One or more tests are inactive and cannot be ordered');
          }

          const existingOrders = await tx.testOrder.findMany({
            where: { visitId, testId: { in: testIds }, deletedAt: null },
            select: { testId: true },
          });

          if (existingOrders.length > 0) {
            throw new ConflictError('One or more tests are already ordered for this visit');
          }

          const createdOrders = await Promise.all(
            tests.map((test) =>
              tx.testOrder.create({
                data: {
                  tenantId: env.DEFAULT_TENANT_ID,
                  visitId,
                  testId: test.testId,
                  priority: test.priority,
                  notes: test.notes ?? undefined,
                },
                include: {
                  visit: { include: { patient: true } },
                  test: true,
                  sample: true,
                  result: true,
                },
              }),
            ),
          );

          return createdOrders;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      ) {
        if (attempt < MAX_SERIALIZABLE_RETRIES) {
          continue;
        }
        throw new ConflictError('Concurrent ordering conflict. Please retry the request.');
      }

      throw error;
    }
  }

  throw new ConflictError('Could not create test orders due to concurrent updates.');
};

/**
 * Get test order by ID
 */
export const getTestOrderById = async (testOrderId: string) => {
  const testOrder = await testOrderRepository.findById(testOrderId);

  if (!testOrder) {
    throw new NotFoundError('Test order not found');
  }

  return testOrder;
};

/**
 * Get all test orders for a visit
 */
export const getVisitTestOrders = async (visitId: string) => {
  // Verify visit exists
  const visit = await prisma.visit.findUnique({
    where: { id: visitId, deletedAt: null },
  });

  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  return testOrderRepository.findByVisitId(visitId);
};

/**
 * Get all test orders (paginated)
 * Admin can view all test orders
 */
export const getAllTestOrders = async (pagination: PaginationParams) => {
  return testOrderRepository.findAll(pagination);
};

/**
 * Update test order (priority, notes)
 */
export const updateTestOrder = async (
  testOrderId: string,
  data: UpdateTestOrderInput,
  _updatedByUserId: string,
) => {
  // Verify test order exists
  const existingTestOrder = await testOrderRepository.findById(testOrderId);
  if (!existingTestOrder) {
    throw new NotFoundError('Test order not found');
  }

  // Update test order
  const updatedTestOrder = await testOrderRepository.update(testOrderId, {
    ...data,
    notes: data.notes ?? undefined,
  });

  return updatedTestOrder;
};

/**
 * Cancel/delete test order
 * Can only be deleted if no sample has been collected or result entered
 */
export const cancelTestOrder = async (testOrderId: string, _cancelledByUserId: string) => {
  // Verify test order exists
  const existingTestOrder = await testOrderRepository.findById(testOrderId);
  if (!existingTestOrder) {
    throw new NotFoundError('Test order not found');
  }

  // Check if sample has been collected
  if (existingTestOrder.sample) {
    throw new ConflictError(
      'Cannot cancel test order after sample has been collected. Please contact administrator.',
    );
  }

  // Check if result has been entered
  if (existingTestOrder.result) {
    throw new ConflictError(
      'Cannot cancel test order after result has been entered. Please contact administrator.',
    );
  }

  // Soft delete
  await testOrderRepository.softDelete(testOrderId);
};
