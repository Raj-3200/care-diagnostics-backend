import { z } from 'zod';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

export const createInvoiceSchema = z.object({
  visitId: z.string().uuid('Invalid visit ID'),
  discountAmount: z.number().min(0).optional().default(0),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  notes: z.string().max(2000).optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  notes: z.string().max(2000).optional(),
});

export const applyDiscountSchema = z.object({
  discountAmount: z.number().min(0, 'Discount cannot be negative'),
  notes: z.string().max(2000).optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(2000),
});

export const refundInvoiceSchema = z.object({
  reason: z.string().min(1, 'Refund reason is required').max(2000),
});

export const invoiceListSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().default('30').transform(Number).pipe(z.number().min(1).max(100)),
  status: z.nativeEnum(InvoiceStatus).optional(),
  patientId: z.string().uuid('Invalid patient ID').optional(),
});
