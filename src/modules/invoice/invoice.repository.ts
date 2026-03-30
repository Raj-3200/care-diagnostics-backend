import { prisma } from '../../config/database.js';
import { Prisma, InvoiceStatus, PaymentMethod } from '@prisma/client';

const invoiceIncludes = {
  visit: {
    include: {
      patient: true,
      testOrders: {
        include: {
          test: true,
        },
      },
    },
  },
};

export const findById = async (id: string) => {
  return prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: invoiceIncludes,
  });
};

export const findByInvoiceNumber = async (invoiceNumber: string) => {
  return prisma.invoice.findFirst({
    where: { invoiceNumber, deletedAt: null },
    include: invoiceIncludes,
  });
};

export const findByVisitId = async (visitId: string) => {
  return prisma.invoice.findFirst({
    where: { visitId, deletedAt: null },
    include: invoiceIncludes,
  });
};

export const findAll = async (params: {
  page: number;
  limit: number;
  status?: string;
  patientId?: string;
}) => {
  const { page, limit, status, patientId } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = { deletedAt: null };
  if (status) where.status = status as InvoiceStatus;
  if (patientId) {
    where.visit = { patientId, deletedAt: null };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: invoiceIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total };
};

export const create = async (data: {
  tenantId: string;
  visitId: string;
  invoiceNumber: string;
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  netAmount: number;
  paidAmount?: number;
  dueAmount: number;
  notes?: string | null;
}) => {
  return prisma.invoice.create({
    data: {
      tenantId: data.tenantId,
      visitId: data.visitId,
      invoiceNumber: data.invoiceNumber,
      totalAmount: data.totalAmount,
      discountAmount: data.discountAmount ?? 0,
      taxAmount: data.taxAmount ?? 0,
      netAmount: data.netAmount,
      paidAmount: data.paidAmount ?? 0,
      dueAmount: data.dueAmount,
      notes: data.notes ?? undefined,
    },
    include: invoiceIncludes,
  });
};

export const update = async (
  id: string,
  data: {
    paidAmount?: number;
    dueAmount?: number;
    status?: InvoiceStatus;
    paymentMethod?: PaymentMethod;
    notes?: string | null;
    discountAmount?: number;
    taxAmount?: number;
    netAmount?: number;
  },
) => {
  return prisma.invoice.update({
    where: { id },
    data,
    include: invoiceIncludes,
  });
};

export const softDelete = async (id: string) => {
  return prisma.invoice.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
