import { Router } from 'express';
import * as reportController from './report.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createReportSchema,
  generateReportSchema,
  approveReportSchema,
  dispatchReportSchema,
  reportListSchema,
} from './report.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All report routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/reports
 * Create a report for a visit
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN, Role.PATHOLOGIST),
  validate(createReportSchema),
  (req, res, next) => void reportController.createReport(req, res, next),
);

/**
 * GET /api/v1/reports
 * List all reports (paginated)
 */
router.get(
  '/',
  validate(reportListSchema, 'query'),
  (req, res, next) => void reportController.listReports(req, res, next),
);

/**
 * GET /api/v1/reports/number/:reportNumber
 * Get report by report number
 */
router.get('/number/:reportNumber', (req, res, next) =>
  void reportController.getReportByNumber(req, res, next),
);

/**
 * GET /api/v1/reports/visit/:visitId
 * Get report by visit ID
 */
router.get('/visit/:visitId', (req, res, next) =>
  void reportController.getReportByVisit(req, res, next),
);

/**
 * GET /api/v1/reports/:id/download
 * Download report as PDF
 */
router.get('/:id/download', (req, res, next) =>
  void reportController.downloadReport(req, res, next),
);

/**
 * GET /api/v1/reports/:id
 * Get report by ID
 */
router.get('/:id', (req, res, next) =>
  void reportController.getReportById(req, res, next),
);

/**
 * PATCH /api/v1/reports/:id/generate
 * Generate the report (PENDING → GENERATED)
 */
router.patch(
  '/:id/generate',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  validate(generateReportSchema),
  (req, res, next) => void reportController.generateReport(req, res, next),
);

/**
 * PATCH /api/v1/reports/:id/approve
 * Approve the report (GENERATED → APPROVED) — Pathologist only
 */
router.patch(
  '/:id/approve',
  authorize(Role.PATHOLOGIST, Role.ADMIN),
  validate(approveReportSchema),
  (req, res, next) => void reportController.approveReport(req, res, next),
);

/**
 * PATCH /api/v1/reports/:id/dispatch
 * Dispatch the report (APPROVED → DISPATCHED)
 */
router.patch(
  '/:id/dispatch',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(dispatchReportSchema),
  (req, res, next) => void reportController.dispatchReport(req, res, next),
);

/**
 * DELETE /api/v1/reports/:id
 * Delete report (soft delete, PENDING only)
 */
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void reportController.deleteReport(req, res, next),
);

export default router;
