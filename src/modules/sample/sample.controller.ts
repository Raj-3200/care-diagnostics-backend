import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as sampleService from './sample.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import {
  CreateSampleInput,
  RecordSampleCollectionInput,
  RejectSampleInput,
  UpdateSampleStatusInput,
  QuickCollectInput,
} from './sample.validators.js';
import { SampleStatus } from '@prisma/client';

/**
 * Create a sample
 * POST /api/v1/samples
 *
 * Access: Lab Technician
 * Initialize a sample collection task
 */
export const createSample = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreateSampleInput;

    const sample = await sampleService.createSample(body);
    sendSuccess(res, sample, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Quick-collect a sample
 * POST /api/v1/samples/collect
 *
 * Access: Lab Technician, Admin
 * Creates sample + marks collected in one step
 */
export const quickCollect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { testOrderId } = req.body as QuickCollectInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const sample = await sampleService.quickCollect(testOrderId, req.user.userId);
    sendSuccess(res, sample, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Receive sample in lab
 * PATCH /api/v1/samples/:id/receive
 *
 * Access: Lab Technician, Admin
 * Transitions sample from COLLECTED → IN_LAB
 */
export const receiveInLab = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const sample = await sampleService.receiveInLab(id, req.user?.userId ?? '');
    sendSuccess(res, sample);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark sample as processed
 * PATCH /api/v1/samples/:id/process
 *
 * Access: Lab Technician, Admin
 * Transitions sample from IN_LAB → PROCESSED
 */
export const markProcessed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const sample = await sampleService.markProcessed(id, req.user?.userId ?? '');
    sendSuccess(res, sample);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sample by ID
 * GET /api/v1/samples/:id
 *
 * Access: All staff
 * Returns sample details with test and patient info
 */
export const getSampleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const sample = await sampleService.getSampleById(id);
    sendSuccess(res, sample, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sample by barcode
 * GET /api/v1/samples/barcode/:barcode
 *
 * Access: Lab Technician
 * Used when scanning sample barcode
 */
export const getSampleByBarcode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { barcode } = req.params;

    const sample = await sampleService.getSampleByBarcode(barcode);
    sendSuccess(res, sample, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sample for test order
 * GET /api/v1/samples/test-order/:testOrderId
 *
 * Access: All staff
 * Returns sample for a specific test order
 */
export const getSampleByTestOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { testOrderId } = req.params;

    const sample = await sampleService.getSampleByTestOrder(testOrderId);
    sendSuccess(res, sample, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * List all samples
 * GET /api/v1/samples?status=COLLECTED&page=1&limit=30
 *
 * Access: All staff
 * Returns paginated list of samples with optional filtering
 */
export const listSamples = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const status = req.query.status as SampleStatus | undefined;

    const { samples, total } = await sampleService.listSamples({ page, limit }, { status });

    sendPaginated(res, samples, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Record sample collection
 * POST /api/v1/samples/:id/collect
 *
 * Access: Lab Technician
 * Mark sample as collected with timestamp
 */
export const recordSampleCollection = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as RecordSampleCollectionInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const sample = await sampleService.recordSampleCollection(id, body, req.user.userId);
    sendSuccess(res, sample, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject sample
 * POST /api/v1/samples/:id/reject
 *
 * Access: Lab Technician
 * Mark sample as rejected with reason (contaminated, broken, etc.)
 */
export const rejectSample = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as RejectSampleInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const sample = await sampleService.rejectSample(id, body, req.user.userId);
    sendSuccess(res, sample, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Update sample status
 * PATCH /api/v1/samples/:id/status
 *
 * Access: Lab Technician
 * Transition sample through lab workflow
 */
export const updateSampleStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateSampleStatusInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const sample = await sampleService.updateSampleStatus(id, body, req.user.userId);
    sendSuccess(res, sample, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
