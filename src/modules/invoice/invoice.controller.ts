import { Response, NextFunction, Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as invoiceService from './invoice.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse.js';
import type { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import type { z } from 'zod';
import type {
  createInvoiceSchema,
  recordPaymentSchema,
  applyDiscountSchema,
  cancelInvoiceSchema,
  refundInvoiceSchema,
} from './invoice.validators.js';

type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;
type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
type RefundInvoiceInput = z.infer<typeof refundInvoiceSchema>;

export const createInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { visitId, discountAmount, taxPercent, notes } = req.body as CreateInvoiceInput;
    const invoice = await invoiceService.createInvoice(
      visitId,
      discountAmount ?? 0,
      taxPercent ?? 0,
      notes,
      req.user!.userId,
    );
    sendSuccess(res, invoice, StatusCodes.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceByNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.getInvoiceByNumber(req.params.invoiceNumber);
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceByVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.getInvoiceByVisit(req.params.visitId);
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const status = req.query.status as string | undefined;
    const patientId = req.query.patientId as string | undefined;

    const { invoices, total } = await invoiceService.listInvoices({
      page,
      limit,
      status,
      patientId,
    });
    sendPaginated(res, invoices, page, limit, total);
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { amount, paymentMethod, notes } = req.body as RecordPaymentInput;
    const invoice = await invoiceService.recordPayment(
      req.params.id,
      amount,
      paymentMethod,
      notes,
      authReq.user!.userId,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const applyDiscount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { discountAmount, notes } = req.body as ApplyDiscountInput;
    const invoice = await invoiceService.applyDiscount(
      req.params.id,
      discountAmount,
      notes,
      authReq.user!.userId,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { reason } = req.body as CancelInvoiceInput;
    const invoice = await invoiceService.cancelInvoice(req.params.id, reason, authReq.user!.userId);
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const refundInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { reason } = req.body as RefundInvoiceInput;
    const invoice = await invoiceService.refundInvoice(req.params.id, reason, authReq.user!.userId);
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await invoiceService.deleteInvoice(req.params.id, authReq.user!.userId);
    sendSuccess(res, { message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};
