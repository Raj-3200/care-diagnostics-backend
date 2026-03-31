import { Router } from 'express';
import * as resultController from './result.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createResultSchema,
  enterResultSchema,
  verifyResultSchema,
  rejectResultSchema,
  resultListSchema,
} from './result.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All result routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/results
 * Create a result - Lab Technician, Admin
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  validate(createResultSchema),
  (req, res, next) => void resultController.createResult(req, res, next),
);

/**
 * GET /api/v1/results?status=VERIFIED&visitId=...&page=1&limit=30
 * List all results - all staff
 */
router.get(
  '/',
  validate(resultListSchema, 'query'),
  (req, res, next) => void resultController.listResults(req, res, next),
);

/**
 * GET /api/v1/results/test-order/:testOrderId
 * Get result by test order ID
 */
router.get('/test-order/:testOrderId', (req, res, next) =>
  void resultController.getResultByTestOrder(req, res, next),
);

/**
 * GET /api/v1/results/:id
 * Get result by ID
 */
router.get('/:id', (req, res, next) => void resultController.getResultById(req, res, next));

/**
 * PATCH /api/v1/results/:id/enter
 * Enter result values - Lab Technician, Admin
 */
router.patch(
  '/:id/enter',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  validate(enterResultSchema),
  (req, res, next) => void resultController.enterResult(req, res, next),
);

/**
 * PATCH /api/v1/results/:id/verify
 * Verify result - Pathologist, Admin
 */
router.patch(
  '/:id/verify',
  authorize(Role.ADMIN, Role.PATHOLOGIST),
  validate(verifyResultSchema),
  (req, res, next) => void resultController.verifyResult(req, res, next),
);

/**
 * PATCH /api/v1/results/:id/reject
 * Reject result - Pathologist, Admin
 */
router.patch(
  '/:id/reject',
  authorize(Role.ADMIN, Role.PATHOLOGIST),
  validate(rejectResultSchema),
  (req, res, next) => void resultController.rejectResult(req, res, next),
);

/**
 * PATCH /api/v1/results/:id/re-enter
 * Re-enter rejected result - Lab Technician, Admin
 */
router.patch(
  '/:id/re-enter',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  validate(enterResultSchema),
  (req, res, next) => void resultController.reEnterResult(req, res, next),
);

export default router;
