import { Router } from 'express';
import * as sampleController from './sample.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createSampleSchema,
  recordSampleCollectionSchema,
  rejectSampleSchema,
  updateSampleStatusSchema,
  sampleListSchema,
  quickCollectSchema,
} from './sample.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All sample routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/samples
 * Create a sample - Lab Technician
 */
router.post(
  '/',
  authorize(Role.LAB_TECHNICIAN),
  validate(createSampleSchema),
  (req, res, next) => void sampleController.createSample(req, res, next),
);

/**
 * POST /api/v1/samples/collect
 * Quick-collect: create + collect a sample in one step
 */
router.post(
  '/collect',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  validate(quickCollectSchema),
  (req, res, next) => void sampleController.quickCollect(req, res, next),
);

/**
 * GET /api/v1/samples?status=COLLECTED&page=1&limit=30
 * List all samples - all staff
 */
router.get(
  '/',
  validate(sampleListSchema, 'query'),
  (req, res, next) => void sampleController.listSamples(req, res, next),
);

/**
 * GET /api/v1/samples/barcode/:barcode
 * Get sample by barcode - for barcode scanning workflows
 */
router.get('/barcode/:barcode', (req, res, next) =>
  void sampleController.getSampleByBarcode(req, res, next),
);

/**
 * GET /api/v1/samples/test-order/:testOrderId
 * Get sample for a test order
 */
router.get('/test-order/:testOrderId', (req, res, next) =>
  void sampleController.getSampleByTestOrder(req, res, next),
);

/**
 * GET /api/v1/samples/:id
 * Get sample by ID
 */
router.get('/:id', (req, res, next) => void sampleController.getSampleById(req, res, next));

/**
 * POST /api/v1/samples/:id/collect
 * Record sample collection - Lab Technician
 */
router.post(
  '/:id/collect',
  authorize(Role.LAB_TECHNICIAN),
  validate(recordSampleCollectionSchema),
  (req, res, next) => void sampleController.recordSampleCollection(req, res, next),
);

/**
 * POST /api/v1/samples/:id/reject
 * Reject sample - Lab Technician
 */
router.post(
  '/:id/reject',
  authorize(Role.LAB_TECHNICIAN),
  validate(rejectSampleSchema),
  (req, res, next) => void sampleController.rejectSample(req, res, next),
);

/**
 * PATCH /api/v1/samples/:id/receive
 * Receive sample in lab (COLLECTED → IN_LAB)
 */
router.patch(
  '/:id/receive',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  (req, res, next) => void sampleController.receiveInLab(req, res, next),
);

/**
 * PATCH /api/v1/samples/:id/process
 * Mark sample as processed (IN_LAB → PROCESSED)
 */
router.patch(
  '/:id/process',
  authorize(Role.ADMIN, Role.LAB_TECHNICIAN),
  (req, res, next) => void sampleController.markProcessed(req, res, next),
);

/**
 * PATCH /api/v1/samples/:id/status
 * Update sample status - Lab Technician
 */
router.patch(
  '/:id/status',
  authorize(Role.LAB_TECHNICIAN),
  validate(updateSampleStatusSchema),
  (req, res, next) => void sampleController.updateSampleStatus(req, res, next),
);

export default router;
