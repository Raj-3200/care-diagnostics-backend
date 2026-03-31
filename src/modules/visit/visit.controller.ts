import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as visitService from './visit.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import { CreateVisitInput, UpdateVisitInput } from './visit.validators.js';
import { VisitStatus } from '@prisma/client';

/**
 * Create a new visit
 * POST /api/v1/visits
 *
 * Access: Admin, Receptionist
 * Called when patient arrives at lab for testing
 * Auto-generates unique visit number
 */
export const createVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreateVisitInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const visit = await visitService.createVisit(body, req.user.userId);
    sendSuccess(res, visit, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get visit by ID
 * GET /api/v1/visits/:id
 *
 * Access: All staff
 * Returns visit details with all test orders
 */
export const getVisitById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const visit = await visitService.getVisitById(id);
    sendSuccess(res, visit, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get visit by visit number
 * GET /api/v1/visits/number/:visitNumber
 *
 * Access: All staff
 * Useful for lab technicians looking up visits from forms/barcodes
 */
export const getVisitByNumber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { visitNumber } = req.params;

    const visit = await visitService.getVisitByNumber(visitNumber);
    sendSuccess(res, visit, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all visits for a specific patient
 * GET /api/v1/visits/patient/:patientId?page=1&limit=30
 *
 * Access: All staff
 * Returns patient's visit history with pagination
 */
export const getPatientVisits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { patientId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const { visits, total } = await visitService.getPatientVisits(patientId, {
      page,
      limit,
    });

    sendPaginated(res, visits, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all visits (with optional filters)
 * GET /api/v1/visits?status=ACTIVE&patientId=...&page=1&limit=30
 *
 * Access: All staff
 * Returns paginated list of visits
 */
export const getAllVisits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const status = req.query.status as VisitStatus | undefined;
    const patientId = req.query.patientId as string | undefined;

    const { visits, total } = await visitService.getAllVisits(
      { page, limit },
      {
        status,
        patientId,
      },
    );

    sendPaginated(res, visits, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Update visit status
 * PATCH /api/v1/visits/:id/status
 *
 * Access: Admin, Receptionist, Lab Technician, Pathologist (based on workflow)
 * Manages visit state progression: REGISTERED → SAMPLES_COLLECTED → IN_PROGRESS → COMPLETED
 */
export const updateVisitStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as { status: VisitStatus };

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const visit = await visitService.updateVisitStatus(
      id,
      body.status,
      req.user.userId,
      req.user.role,
    );
    sendSuccess(res, visit, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Update visit
 * PATCH /api/v1/visits/:id
 *
 * Access: Admin, Receptionist
 * Update notes and other metadata
 */
export const updateVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateVisitInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const visit = await visitService.updateVisit(id, body, req.user.userId);
    sendSuccess(res, visit, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete visit (soft delete)
 * DELETE /api/v1/visits/:id
 *
 * Access: Admin only
 * Note: Cannot delete if visit has test orders
 */
export const deleteVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    await visitService.deleteVisit(id, req.user.userId);
    sendSuccess(res, { message: 'Visit deleted successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
