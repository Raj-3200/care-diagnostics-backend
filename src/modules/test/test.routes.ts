import { Router } from 'express';
import * as testController from './test.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createTestSchema, updateTestSchema, testListSchema } from './test.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All test routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/tests
 * Create new test definition - Admin only
 */
router.post(
  '/',
  authorize(Role.ADMIN),
  validate(createTestSchema),
  (req, res, next) => void testController.createTest(req, res, next),
);

/**
 * GET /api/v1/tests?category=...&isActive=true&searchTerm=...&page=1&limit=30
 * List all tests - all staff can access
 */
router.get(
  '/',
  validate(testListSchema, 'query'),
  (req, res, next) => void testController.listTests(req, res, next),
);

/**
 * GET /api/v1/tests/code/:code
 * Get test by code
 */
router.get('/code/:code', (req, res, next) => void testController.getTestByCode(req, res, next));

/**
 * GET /api/v1/tests/category/:category?page=1&limit=30
 * Get tests by category
 */
router.get('/category/:category', (req, res, next) =>
  void testController.getTestsByCategory(req, res, next),
);

/**
 * GET /api/v1/tests/:id
 * Get test by ID
 */
router.get('/:id', (req, res, next) => void testController.getTestById(req, res, next));

/**
 * PATCH /api/v1/tests/:id
 * Update test details - Admin only
 */
router.patch(
  '/:id',
  authorize(Role.ADMIN),
  validate(updateTestSchema),
  (req, res, next) => void testController.updateTest(req, res, next),
);

/**
 * PATCH /api/v1/tests/:id/deactivate
 * Deactivate test - Admin only
 */
router.patch(
  '/:id/deactivate',
  authorize(Role.ADMIN),
  (req, res, next) => void testController.deactivateTest(req, res, next),
);

/**
 * PATCH /api/v1/tests/:id/activate
 * Activate test - Admin only
 */
router.patch(
  '/:id/activate',
  authorize(Role.ADMIN),
  (req, res, next) => void testController.activateTest(req, res, next),
);

/**
 * DELETE /api/v1/tests/:id
 * Soft delete test - Admin only
 */
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void testController.deleteTest(req, res, next),
);

export default router;
