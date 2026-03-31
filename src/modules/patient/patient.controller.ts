import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as patientService from './patient.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import {
  CreatePatientInput,
  UpdatePatientInput,
  SearchPatientInput,
} from './patient.validators.js';

/**
 * Register a new patient
 * POST /api/v1/patients
 *
 * Access: Admin, Receptionist
 * Called when a patient arrives for the first time at the lab
 * Generates MRN automatically
 */
export const registerPatient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreatePatientInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    // If a CLIENT registers a patient, auto-link to that client
    if (req.user.role === 'CLIENT') {
      body.referredByClientId = req.user.userId;
    }

    const patient = await patientService.registerPatient(body, req.user.userId);
    sendSuccess(res, patient, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Search and list patients
 * GET /api/v1/patients?searchTerm=...&page=1&limit=30
 *
 * Access: All staff roles (Admin, Receptionist, Lab Technician, Pathologist)
 * Used for patient lookup during visit creation, test ordering, etc.
 */
export const searchPatients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { searchTerm, page, limit } = req.query as unknown as SearchPatientInput;

    const { patients, total } = await patientService.searchPatients(
      { page, limit },
      { searchTerm },
    );

    sendPaginated(res, patients, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient by ID
 * GET /api/v1/patients/:id
 *
 * Access: All staff, or patient viewing own profile
 * Returns full patient demographics and registration info
 */
export const getPatientById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const patient = await patientService.getPatientById(id);
    sendSuccess(res, patient, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient by MRN
 * GET /api/v1/patients/mrn/:mrn
 *
 * Access: All staff, or patient with their own MRN
 * Useful for direct MRN lookup from lab forms
 */
export const getPatientByMRN = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { mrn } = req.params;

    const patient = await patientService.getPatientByMRN(mrn);
    sendSuccess(res, patient, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Update patient information
 * PATCH /api/v1/patients/:id
 *
 * Access: Admin, Receptionist (for demographic updates)
 * Immutable fields: MRN (cannot be changed)
 * Tracks all changes in audit log for compliance
 */
export const updatePatient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdatePatientInput;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const patient = await patientService.updatePatient(id, body, req.user.userId);
    sendSuccess(res, patient, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (soft delete) patient
 * DELETE /api/v1/patients/:id
 *
 * Access: Admin only
 * Note: This is a soft delete. Patient records are never actually removed for audit trail.
 * Cannot delete if patient has active visits.
 */
export const deletePatient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new Error('User not authenticated');
    }

    await patientService.deletePatient(id, req.user.userId);
    sendSuccess(res, { message: 'Patient deleted successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
