import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as testService from './test.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { CreateTestInput, UpdateTestInput } from './test.validators.js';
import { TestCategory } from '@prisma/client';

/**
 * Create a new test
 * POST /api/v1/tests
 *
 * Access: Admin only
 * Defines a new test that can be ordered
 */
export const createTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreateTestInput;

    const test = await testService.createTest(body);
    sendSuccess(res, test, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get test by ID
 * GET /api/v1/tests/:id
 *
 * Access: All authenticated users
 * Returns test details with pricing, sample type, etc.
 */
export const getTestById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const test = await testService.getTestById(id);
    sendSuccess(res, test, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get test by code
 * GET /api/v1/tests/code/:code
 *
 * Access: All authenticated users
 * Useful for looking up tests by their code
 */
export const getTestByCode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code } = req.params;

    const test = await testService.getTestByCode(code);
    sendSuccess(res, test, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * List all tests
 * GET /api/v1/tests?category=BIOCHEMISTRY&isActive=true&searchTerm=...&page=1&limit=30
 *
 * Access: All authenticated users
 * Used for test selection in visit/order creation
 */
export const listTests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = req.query.category as TestCategory | undefined;
    const isActive = req.query.isActive as string | undefined;
    const searchTerm = req.query.searchTerm as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;

    const { tests, total } = await testService.listTests(
      { page, limit },
      {
        category: category as TestCategory,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        searchTerm,
      },
    );

    sendPaginated(res, tests, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Get tests by category
 * GET /api/v1/tests/category/:category?page=1&limit=30
 *
 * Access: All authenticated users
 * Returns all tests in a specific category
 */
export const getTestsByCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { category } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const { tests, total } = await testService.getTestsByCategory(category as TestCategory, {
      page,
      limit,
    });

    sendPaginated(res, tests, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Update test
 * PATCH /api/v1/tests/:id
 *
 * Access: Admin only
 * Update pricing, turnaround times, instructions, etc.
 */
export const updateTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateTestInput;

    const test = await testService.updateTest(id, body);
    sendSuccess(res, test, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate test
 * PATCH /api/v1/tests/:id/deactivate
 *
 * Access: Admin only
 * Prevents test from appearing in test selection
 * Existing orders remain unaffected
 */
export const deactivateTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const test = await testService.deactivateTest(id);
    sendSuccess(res, test, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Activate test
 * PATCH /api/v1/tests/:id/activate
 *
 * Access: Admin only
 * Makes test available for selection
 */
export const activateTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const test = await testService.activateTest(id);
    sendSuccess(res, test, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete test (soft delete)
 * DELETE /api/v1/tests/:id
 *
 * Access: Admin only
 * Cannot delete if test has existing orders
 */
export const deleteTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    await testService.deleteTest(id);
    sendSuccess(res, { message: 'Test deleted successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
