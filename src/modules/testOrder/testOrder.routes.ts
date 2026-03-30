import { Router } from 'express';
import * as testOrderController from './testOrder.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createTestOrderSchema,
  updateTestOrderSchema,
  bulkCreateTestOrderSchema,
  bulkCreateByIdsSchema,
} from './testOrder.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All test order routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/test-orders
 * Create a single test order
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.RECEPTIONIST, Role.LAB_TECHNICIAN),
  validate(createTestOrderSchema),
  (req, res, next) => void testOrderController.createTestOrder(req, res, next),
);

/**
 * POST /api/v1/test-orders/bulk
 * Create multiple test orders by { visitId, testIds }
 */
router.post(
  '/bulk',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(bulkCreateByIdsSchema),
  (req, res, next) => void testOrderController.bulkCreateByIds(req, res, next),
);

/**
 * POST /api/v1/test-orders/bulk/:visitId
 * Create multiple test orders for a visit (detailed)
 */
router.post(
  '/bulk/:visitId',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(bulkCreateTestOrderSchema),
  (req, res, next) => void testOrderController.bulkCreateTestOrders(req, res, next),
);

/**
 * GET /api/v1/test-orders?page=1&limit=30
 * Get all test orders (paginated)
 */
router.get(
  '/',
  authorize(Role.ADMIN),
  (req, res, next) => void testOrderController.getAllTestOrders(req, res, next),
);

/**
 * GET /api/v1/test-orders/visit/:visitId
 * Get all test orders for a visit
 */
router.get('/visit/:visitId', (req, res, next) =>
  void testOrderController.getVisitTestOrders(req, res, next),
);

/**
 * GET /api/v1/test-orders/:id
 * Get test order by ID
 */
router.get('/:id', (req, res, next) => void testOrderController.getTestOrderById(req, res, next));

/**
 * PATCH /api/v1/test-orders/:id
 * Update test order
 */
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(updateTestOrderSchema),
  (req, res, next) => void testOrderController.updateTestOrder(req, res, next),
);

/**
 * DELETE /api/v1/test-orders/:id
 * Cancel test order
 */
router.delete(
  '/:id',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  (req, res, next) => void testOrderController.cancelTestOrder(req, res, next),
);

export default router;
