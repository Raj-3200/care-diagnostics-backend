import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as resultService from './result.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import {
  CreateResultInput,
  EnterResultInput,
  VerifyResultInput,
  RejectResultInput,
} from './result.validators.js';
import { ResultStatus } from '@prisma/client';

/**
 * Create a result placeholder
 * POST /api/v1/results
 *
 * Access: Lab Technician
 * Initialize result entry workflow
 */
export const createResult = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreateResultInput;

    const result = await resultService.createResult(body);
    sendSuccess(res, result, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get result by ID
 * GET /api/v1/results/:id
 *
 * Access: All staff
 * Returns result details with test and patient info
 */
export const getResultById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await resultService.getResultById(id);
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get result by test order ID
 * GET /api/v1/results/test-order/:testOrderId
 *
 * Access: All staff
 * Returns result for a specific test order
 */
export const getResultByTestOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { testOrderId } = req.params;

    const result = await resultService.getResultByTestOrder(testOrderId);
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * List all results
 * GET /api/v1/results?status=VERIFIED&visitId=...&page=1&limit=30
 *
 * Access: All staff
 * Returns paginated list of results with optional filtering
 */
export const listResults = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const status = req.query.status as ResultStatus | undefined;
    const visitId = req.query.visitId as string | undefined;

    const { results, total } = await resultService.listResults(
      { page, limit },
      { status, visitId },
    );

    sendPaginated(res, results, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Enter result values
 * POST /api/v1/results/:id/enter
 *
 * Access: Lab Technician
 * Lab tech enters numeric/value result
 */
export const enterResult = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as EnterResultInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await resultService.enterResult(id, body, req.user.userId);
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify/approve result
 * POST /api/v1/results/:id/verify
 *
 * Access: Pathologist
 * Pathologist confirms result is correct
 */
export const verifyResult = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as VerifyResultInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await resultService.verifyResult(id, body, req.user.userId);
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject result
 * POST /api/v1/results/:id/reject
 *
 * Access: Pathologist
 * Pathologist rejects result for re-entry
 */
export const rejectResult = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as RejectResultInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await resultService.rejectResult(id, body, req.user.userId);
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Re-enter rejected result
 * POST /api/v1/results/:id/re-enter
 *
 * Access: Lab Technician
 * Lab tech re-enters rejected result with correct values
 */
export const reEnterResult = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as EnterResultInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await resultService.reEnterResult(id, body, req.user.userId);
    sendSuccess(res, result, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
