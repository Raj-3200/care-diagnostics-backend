import * as invoiceRepository from './invoice.repository.js';
import * as visitRepository from '../visit/visit.repository.js';
import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError, ValidationError } from '../../shared/errors/AppError.js';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { createAuditLog } from '../../shared/utils/audit.js';
import { env } from '../../config/env.js';

// Auto-generate invoice number: CD-INV-YYYYMMDD-XXXX
const generateInvoiceNumber = async (): Promise<string> => {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  const prefix = `CD-INV-${dateStr}`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let sequence = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split('-');
    sequence = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
};

/**
 * Create an invoice for a visit.
 * Automatically sums test prices from the visit's test orders.
 */
export const createInvoice = async (
  visitId: string,
  discountAmount: number,
  taxPercent: number,
  notes: string | undefined,
  userId: string,
) => {
  // Validate numeric inputs
  if (discountAmount < 0) {
    throw new ValidationError('Discount amount cannot be negative');
  }
  if (taxPercent < 0 || taxPercent > 100) {
    throw new ValidationError('Tax percent must be between 0 and 100');
  }

  // Validate visit exists
  const visit = await visitRepository.findById(visitId);
  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  // Check if invoice already exists
  const existingInvoice = await invoiceRepository.findByVisitId(visitId);
  if (existingInvoice) {
    throw new ConflictError('Invoice already exists for this visit');
  }

  // Fetch test orders with test details for pricing
  const testOrders = await prisma.testOrder.findMany({
    where: { visitId, deletedAt: null },
    include: { test: true },
  });

  if (testOrders.length === 0) {
    throw new ValidationError('Cannot create invoice: no test orders found for this visit');
  }

  const totalAmount = testOrders.reduce(
    (sum: number, to) => sum + parseFloat(to.test.price.toString()),
    0,
  );

  const discount = Math.min(discountAmount, totalAmount);
  const afterDiscount = totalAmount - discount;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const netAmount = afterDiscount + taxAmount;
  const dueAmount = netAmount; // Nothing paid yet

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await invoiceRepository.create({
    tenantId: env.DEFAULT_TENANT_ID,
    visitId,
    invoiceNumber,
    totalAmount: Math.round(totalAmount * 100) / 100,
    discountAmount: Math.round(discount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    paidAmount: 0,
    dueAmount: Math.round(dueAmount * 100) / 100,
    notes,
  });

  // Audit log
  await createAuditLog({
    userId,
    action: 'INVOICE_CREATED',
    entity: 'Invoice',
    entityId: invoice.id,
    newValue: { invoiceNumber, totalAmount, netAmount, visitId },
  });

  // Domain event
  await eventBus.emit({
    type: EVENTS.INVOICE_CREATED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Invoice',
    entityId: invoice.id,
    userId,
    payload: { invoiceNumber, totalAmount, netAmount, visitId },
  });

  return invoice;
};

/**
 * Get invoice by ID
 */
export const getInvoiceById = async (id: string) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }
  return invoice;
};

/**
 * Get invoice by invoice number
 */
export const getInvoiceByNumber = async (invoiceNumber: string) => {
  const invoice = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }
  return invoice;
};

/**
 * Get invoice by visit ID
 */
export const getInvoiceByVisit = async (visitId: string) => {
  const invoice = await invoiceRepository.findByVisitId(visitId);
  if (!invoice) {
    throw new NotFoundError('Invoice not found for this visit');
  }
  return invoice;
};

/**
 * List all invoices (paginated, filterable)
 */
export const listInvoices = async (params: {
  page: number;
  limit: number;
  status?: string;
  patientId?: string;
}) => {
  return invoiceRepository.findAll(params);
};

/**
 * Record a payment against an invoice
 */
export const recordPayment = async (
  id: string,
  amount: number,
  paymentMethod: PaymentMethod,
  notes: string | undefined,
  userId: string,
) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
    throw new ValidationError(`Cannot record payment for ${invoice.status} invoice`);
  }

  const currentPaid = parseFloat(invoice.paidAmount.toString());
  const currentNet = parseFloat(invoice.netAmount.toString());

  if (amount > parseFloat(invoice.dueAmount.toString())) {
    throw new ValidationError(
      `Payment amount (${amount}) exceeds due amount (${invoice.dueAmount.toString()})`,
    );
  }

  const newPaid = Math.round((currentPaid + amount) * 100) / 100;
  const newDue = Math.round((currentNet - newPaid) * 100) / 100;
  const newStatus = newDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

  const updated = await invoiceRepository.update(id, {
    paidAmount: newPaid,
    dueAmount: newDue,
    status: newStatus,
    paymentMethod,
    notes: notes ?? invoice.notes,
  });

  await createAuditLog({
    userId,
    action: 'PAYMENT_RECORDED',
    entity: 'Invoice',
    entityId: id,
    oldValue: { paidAmount: currentPaid, dueAmount: invoice.dueAmount, status: invoice.status },
    newValue: { paidAmount: newPaid, dueAmount: newDue, status: newStatus, paymentMethod, amount },
  });

  // Emit event if fully paid
  if (newStatus === InvoiceStatus.PAID) {
    await eventBus.emit({
      type: EVENTS.INVOICE_PAID,
      tenantId: env.DEFAULT_TENANT_ID,
      entity: 'Invoice',
      entityId: id,
      userId,
      payload: { invoiceNumber: invoice.invoiceNumber, netAmount: currentNet },
    });
  }

  return updated;
};

/**
 * Apply discount to an invoice (only PENDING invoices)
 */
export const applyDiscount = async (
  id: string,
  discountAmount: number,
  notes: string | undefined,
  userId: string,
) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  if (invoice.status !== InvoiceStatus.PENDING) {
    throw new ValidationError('Discount can only be applied to PENDING invoices');
  }

  const totalAmount = parseFloat(invoice.totalAmount.toString());
  const discount = Math.min(discountAmount, totalAmount);
  const oldTax = parseFloat(invoice.taxAmount.toString());
  const oldNet = parseFloat(invoice.netAmount.toString());
  // Recalculate: get the tax rate from existing values
  const oldAfterDiscount = totalAmount - parseFloat(invoice.discountAmount.toString());
  const taxRate = oldAfterDiscount > 0 ? (oldTax / oldAfterDiscount) * 100 : 0;

  const afterDiscount = totalAmount - discount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const netAmount = afterDiscount + taxAmount;

  const updated = await invoiceRepository.update(id, {
    discountAmount: Math.round(discount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    dueAmount: Math.round(netAmount * 100) / 100,
    notes: notes ?? invoice.notes,
  });

  await createAuditLog({
    userId,
    action: 'DISCOUNT_APPLIED',
    entity: 'Invoice',
    entityId: id,
    oldValue: { discountAmount: invoice.discountAmount, netAmount: oldNet },
    newValue: { discountAmount: discount, netAmount },
  });

  return updated;
};

/**
 * Cancel an invoice (only PENDING or PARTIAL)
 */
export const cancelInvoice = async (id: string, reason: string, userId: string) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  if (invoice.status !== InvoiceStatus.PENDING && invoice.status !== InvoiceStatus.PARTIAL) {
    throw new ValidationError(
      `Cannot cancel invoice in ${invoice.status} status. Must be PENDING or PARTIAL.`,
    );
  }

  const updated = await invoiceRepository.update(id, {
    status: InvoiceStatus.CANCELLED,
    notes: reason,
  });

  await createAuditLog({
    userId,
    action: 'INVOICE_CANCELLED',
    entity: 'Invoice',
    entityId: id,
    oldValue: { status: invoice.status },
    newValue: { status: InvoiceStatus.CANCELLED, reason },
  });

  return updated;
};

/**
 * Refund an invoice (only PAID or PARTIAL)
 */
export const refundInvoice = async (id: string, reason: string, userId: string) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  if (invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.PARTIAL) {
    throw new ValidationError(
      `Cannot refund invoice in ${invoice.status} status. Must be PAID or PARTIAL.`,
    );
  }

  const paidAmount = parseFloat(invoice.paidAmount.toString());

  const updated = await invoiceRepository.update(id, {
    status: InvoiceStatus.REFUNDED,
    paidAmount: 0,
    dueAmount: 0,
    notes: reason,
  });

  await createAuditLog({
    userId,
    action: 'INVOICE_REFUNDED',
    entity: 'Invoice',
    entityId: id,
    oldValue: { status: invoice.status, paidAmount },
    newValue: { status: InvoiceStatus.REFUNDED, refundedAmount: paidAmount, reason },
  });

  return updated;
};

/**
 * Delete invoice (soft delete) — only PENDING
 */
export const deleteInvoice = async (id: string, userId: string) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  if (invoice.status !== InvoiceStatus.PENDING) {
    throw new ValidationError('Cannot delete invoice that is not in PENDING status');
  }

  await invoiceRepository.softDelete(id);

  await createAuditLog({
    userId,
    action: 'INVOICE_DELETED',
    entity: 'Invoice',
    entityId: id,
    oldValue: { invoiceNumber: invoice.invoiceNumber, status: invoice.status },
  });
};
