import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as testOrderService from './testOrder.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import {
  CreateTestOrderInput,
  UpdateTestOrderInput,
  BulkCreateTestOrderInput,
  BulkCreateByIdsInput,
} from './testOrder.validators.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';

/**
 * Create a test order
 * POST /api/v1/test-orders
 *
 * Access: Admin, Receptionist, Lab Technician
 * Orders a single test for a visit
 */
export const createTestOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreateTestOrderInput;

    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const testOrder = await testOrderService.createTestOrder(body, req.user.userId);
    sendSuccess(res, testOrder, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Create multiple test orders
 * POST /api/v1/test-orders/bulk/:visitId
 *
 * Access: Admin, Receptionist
 * Orders multiple tests in one API call
 */
export const bulkCreateTestOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { visitId } = req.params;
    const body = req.body as BulkCreateTestOrderInput;

    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const testOrders = await testOrderService.bulkCreateTestOrders(visitId, body, req.user.userId);
    sendSuccess(res, testOrders, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Create multiple test orders by test IDs
 * POST /api/v1/test-orders/bulk
 * Body: { visitId, testIds }
 *
 * Access: Admin, Receptionist
 */
export const bulkCreateByIds = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as BulkCreateByIdsInput;

    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const tests = body.testIds.map((testId) => ({
      testId,
      priority: 'NORMAL' as const,
    }));
    const testOrders = await testOrderService.bulkCreateTestOrders(
      body.visitId,
      tests,
      req.user.userId,
    );
    sendSuccess(res, testOrders, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get test order by ID
 * GET /api/v1/test-orders/:id
 *
 * Access: All staff
 * Returns test order with sample and result info
 */
export const getTestOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const testOrder = await testOrderService.getTestOrderById(id);
    sendSuccess(res, testOrder, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all test orders for a visit
 * GET /api/v1/test-orders/visit/:visitId
 *
 * Access: All staff
 * Returns all tests ordered for a specific visit
 */
export const getVisitTestOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { visitId } = req.params;

    const testOrders = await testOrderService.getVisitTestOrders(visitId);
    sendSuccess(res, testOrders, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all test orders
 * GET /api/v1/test-orders?page=1&limit=30
 *
 * Access: Admin
 * Returns paginated list of all test orders
 */
export const getAllTestOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const { testOrders, total } = await testOrderService.getAllTestOrders({
      page,
      limit,
    });

    sendPaginated(res, testOrders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Update test order
 * PATCH /api/v1/test-orders/:id
 *
 * Access: Admin, Receptionist
 * Update priority or notes
 */
export const updateTestOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateTestOrderInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const testOrder = await testOrderService.updateTestOrder(id, body, req.user.userId);
    sendSuccess(res, testOrder, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel test order
 * DELETE /api/v1/test-orders/:id
 *
 * Access: Admin, Receptionist
 * Cannot cancel if sample collected or result entered
 */
export const cancelTestOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    await testOrderService.cancelTestOrder(id, req.user.userId);
    sendSuccess(res, { message: 'Test order cancelled successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
