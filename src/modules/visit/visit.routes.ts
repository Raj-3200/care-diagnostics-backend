import { Router } from 'express';
import * as visitController from './visit.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createVisitSchema, updateVisitSchema } from './visit.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All visit routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/visits
 * Create a new visit - requires Admin or Receptionist
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(createVisitSchema),
  (req, res, next) => void visitController.createVisit(req, res, next),
);

/**
 * GET /api/v1/visits?status=...&patientId=...&page=1&limit=30
 * Get all visits - all staff can access
 */
router.get(
  '/',
  (req, res, next) => void visitController.getAllVisits(req, res, next),
);

/**
 * GET /api/v1/visits/number/:visitNumber
 * Get visit by visit number - useful for lab workflows
 */
router.get('/number/:visitNumber', (req, res, next) =>
  void visitController.getVisitByNumber(req, res, next),
);

/**
 * GET /api/v1/visits/patient/:patientId?page=1&limit=30
 * Get all visits for a patient
 */
router.get('/patient/:patientId', (req, res, next) =>
  void visitController.getPatientVisits(req, res, next),
);

/**
 * GET /api/v1/visits/:id
 * Get visit by ID
 */
router.get('/:id', (req, res, next) => void visitController.getVisitById(req, res, next));

/**
 * PATCH /api/v1/visits/:id/status
 * Update visit status - workflow progression
 */
router.patch(
  '/:id/status',
  validate(updateVisitSchema),
  (req, res, next) => void visitController.updateVisitStatus(req, res, next),
);

/**
 * PATCH /api/v1/visits/:id
 * Update visit details
 */
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(updateVisitSchema),
  (req, res, next) => void visitController.updateVisit(req, res, next),
);

/**
 * DELETE /api/v1/visits/:id
 * Soft delete visit - Admin only
 */
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void visitController.deleteVisit(req, res, next),
);

export default router;
