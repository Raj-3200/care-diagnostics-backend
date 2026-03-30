import * as testRepository from './test.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CreateTestInput, UpdateTestInput } from './test.validators.js';
import { TestCategory } from '@prisma/client';
import { env } from '../../config/env.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../../core/cache.js';

/**
 * Create a new test definition
 * Tests are master data - defined once, used many times
 * Test codes must be unique and human-readable
 */
export const createTest = async (data: CreateTestInput) => {
  // Check for duplicate code
  const existingTest = await testRepository.findByCode(data.code);
  if (existingTest) {
    throw new ConflictError('Test with this code already exists');
  }

  // Create test
  const test = await testRepository.create({
    tenantId: env.DEFAULT_TENANT_ID,
    code: data.code,
    name: data.name,
    category: data.category,
    sampleType: data.sampleType,
    price: data.price,
    turnaroundTime: data.turnaroundTime,
    ...(data.description != null && { description: data.description }),
    ...(data.department != null && { department: data.department }),
    ...(data.instructions != null && { instructions: data.instructions }),
  });

  return test;
};

/**
 * Get test by ID
 */
export const getTestById = async (testId: string) => {
  // Check cache first — tests rarely change
  const cacheKey = `test:${testId}`;
  const cached = await cacheGet<Awaited<ReturnType<typeof testRepository.findById>>>(cacheKey);
  if (cached) return cached;

  const test = await testRepository.findById(testId);

  if (!test) {
    throw new NotFoundError('Test not found');
  }

  await cacheSet(cacheKey, test, 3600); // 1 hour TTL
  return test;
};

/**
 * Get test by code
 */
export const getTestByCode = async (code: string) => {
  const test = await testRepository.findByCode(code);

  if (!test) {
    throw new NotFoundError('Test not found');
  }

  return test;
};

/**
 * List all tests with optional filters
 * Useful for:
 * - Receptionist when ordering tests
 * - Admin when managing test catalog
 */
export const listTests = async (
  pagination: PaginationParams,
  filters?: {
    category?: TestCategory;
    isActive?: boolean;
    searchTerm?: string;
  },
) => {
  return testRepository.findAll(pagination, filters);
};

/**
 * Get tests by category
 * Useful for filtering tests by category in UI
 */
export const getTestsByCategory = async (category: TestCategory, pagination: PaginationParams) => {
  return testRepository.findByCategory(category, pagination);
};

/**
 * Update test definition
 * Can update pricing, turnaround times, instructions, etc.
 * Cannot change test code once created
 */
export const updateTest = async (testId: string, data: UpdateTestInput) => {
  // Verify test exists
  const existingTest = await testRepository.findById(testId);
  if (!existingTest) {
    throw new NotFoundError('Test not found');
  }

  // Update test
  const { description, department, instructions, ...rest } = data;
  const updatedTest = await testRepository.update(testId, {
    ...rest,
    ...(description !== undefined && { description: description ?? undefined }),
    ...(department !== undefined && { department: department ?? undefined }),
    ...(instructions !== undefined && { instructions: instructions ?? undefined }),
  });

  // Invalidate cache
  await cacheInvalidate(`test:${testId}`);

  return updatedTest;
};

/**
 * Deactivate test (soft delete)
 * Deactivated tests won't appear in test selection UI
 * But existing orders using this test remain valid
 */
export const deactivateTest = async (testId: string) => {
  // Verify test exists
  const existingTest = await testRepository.findById(testId);
  if (!existingTest) {
    throw new NotFoundError('Test not found');
  }

  // Mark as inactive
  const updatedTest = await testRepository.update(testId, { isActive: false });

  return updatedTest;
};

/**
 * Activate test
 */
export const activateTest = async (testId: string) => {
  // Verify test exists
  const existingTest = await testRepository.findById(testId);
  if (!existingTest) {
    throw new NotFoundError('Test not found');
  }

  // Mark as active
  const updatedTest = await testRepository.update(testId, { isActive: true });

  return updatedTest;
};

/**
 * Delete test (soft delete)
 * Can only delete if no test orders exist for this test
 */
export const deleteTest = async (testId: string) => {
  // Verify test exists
  const existingTest = await testRepository.findById(testId);
  if (!existingTest) {
    throw new NotFoundError('Test not found');
  }

  // Check if test is used in any test orders
  const testOrderCount = await prisma.testOrder.count({
    where: { testId, deletedAt: null },
  });

  if (testOrderCount > 0) {
    throw new ConflictError(
      'Cannot delete test with existing orders. Consider deactivating instead.',
    );
  }

  // Soft delete
  await testRepository.softDelete(testId);
};
