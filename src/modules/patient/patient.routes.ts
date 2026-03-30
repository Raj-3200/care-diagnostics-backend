import { Router } from 'express';
import * as patientController from './patient.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
} from './patient.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All patient routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/patients
 * Register new patient - requires Admin or Receptionist
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(createPatientSchema),
  (req, res, next) => void patientController.registerPatient(req, res, next),
);

/**
 * GET /api/v1/patients?searchTerm=...&page=1&limit=30
 * Search patients - all staff can access (for visit/test workflows)
 */
router.get(
  '/',
  validate(searchPatientSchema, 'query'),
  (req, res, next) => void patientController.searchPatients(req, res, next),
);

/**
 * GET /api/v1/patients/mrn/:mrn
 * Get patient by MRN - useful for lab workflows
 */
router.get('/mrn/:mrn', (req, res, next) =>
  void patientController.getPatientByMRN(req, res, next),
);

/**
 * GET /api/v1/patients/:id
 * Get patient by ID
 */
router.get('/:id', (req, res, next) => void patientController.getPatientById(req, res, next));

/**
 * PATCH /api/v1/patients/:id
 * Update patient info - Admin or Receptionist
 */
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(updatePatientSchema),
  (req, res, next) => void patientController.updatePatient(req, res, next),
);

/**
 * DELETE /api/v1/patients/:id
 * Soft delete patient - Admin only
 */
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void patientController.deletePatient(req, res, next),
);

export default router;
