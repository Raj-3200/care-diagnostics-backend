import { Router } from 'express';
import * as invoiceController from './invoice.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createInvoiceSchema,
  recordPaymentSchema,
  applyDiscountSchema,
  cancelInvoiceSchema,
  refundInvoiceSchema,
  invoiceListSchema,
} from './invoice.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All invoice routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/invoices
 * Create an invoice for a visit (auto-calculates from test orders)
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(createInvoiceSchema),
  (req, res, next) => void invoiceController.createInvoice(req, res, next),
);

/**
 * GET /api/v1/invoices
 * List all invoices (paginated)
 */
router.get(
  '/',
  validate(invoiceListSchema, 'query'),
  (req, res, next) => void invoiceController.listInvoices(req, res, next),
);

/**
 * GET /api/v1/invoices/number/:invoiceNumber
 * Get invoice by invoice number
 */
router.get('/number/:invoiceNumber', (req, res, next) =>
  void invoiceController.getInvoiceByNumber(req, res, next),
);

/**
 * GET /api/v1/invoices/visit/:visitId
 * Get invoice by visit ID
 */
router.get('/visit/:visitId', (req, res, next) =>
  void invoiceController.getInvoiceByVisit(req, res, next),
);

/**
 * GET /api/v1/invoices/:id
 * Get invoice by ID
 */
router.get('/:id', (req, res, next) =>
  void invoiceController.getInvoiceById(req, res, next),
);

/**
 * POST /api/v1/invoices/:id/payment
 * Record a payment against an invoice
 */
router.post(
  '/:id/payment',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(recordPaymentSchema),
  (req, res, next) => void invoiceController.recordPayment(req, res, next),
);

/**
 * POST /api/v1/invoices/:id/discount
 * Apply discount to invoice (PENDING only)
 */
router.post(
  '/:id/discount',
  authorize(Role.ADMIN),
  validate(applyDiscountSchema),
  (req, res, next) => void invoiceController.applyDiscount(req, res, next),
);

/**
 * POST /api/v1/invoices/:id/cancel
 * Cancel an invoice (PENDING or PARTIAL)
 */
router.post(
  '/:id/cancel',
  authorize(Role.ADMIN),
  validate(cancelInvoiceSchema),
  (req, res, next) => void invoiceController.cancelInvoice(req, res, next),
);

/**
 * POST /api/v1/invoices/:id/refund
 * Refund an invoice (PAID or PARTIAL)
 */
router.post(
  '/:id/refund',
  authorize(Role.ADMIN),
  validate(refundInvoiceSchema),
  (req, res, next) => void invoiceController.refundInvoice(req, res, next),
);

/**
 * DELETE /api/v1/invoices/:id
 * Delete invoice (soft delete, PENDING only)
 */
router.delete(
  '/:id',
  authorize(Role.ADMIN),
  (req, res, next) => void invoiceController.deleteInvoice(req, res, next),
);

export default router;
