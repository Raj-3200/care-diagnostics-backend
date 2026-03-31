import { prisma } from '../../config/database.js';
import { Prisma, ReportStatus } from '@prisma/client';

export const reportIncludes = {
  visit: {
    include: {
      patient: true,
      testOrders: {
        include: {
          test: true,
          result: true,
        },
      },
    },
  },
  approvedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
};

export const findById = async (id: string) => {
  return prisma.report.findFirst({
    where: { id, deletedAt: null },
    include: reportIncludes,
  });
};

export const findByReportNumber = async (reportNumber: string) => {
  return prisma.report.findFirst({
    where: { reportNumber, deletedAt: null },
    include: reportIncludes,
  });
};

export const findByVisitId = async (visitId: string) => {
  return prisma.report.findFirst({
    where: { visitId, deletedAt: null },
    include: reportIncludes,
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

  const where: Prisma.ReportWhereInput = { deletedAt: null };
  if (status) where.status = status as ReportStatus;
  if (patientId) {
    where.visit = { patientId, deletedAt: null };
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: reportIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total };
};

export const create = async (data: {
  tenantId: string;
  visitId: string;
  reportNumber: string;
  notes?: string | null;
}) => {
  return prisma.report.create({
    data: {
      tenantId: data.tenantId,
      visitId: data.visitId,
      reportNumber: data.reportNumber,
      notes: data.notes ?? undefined,
    },
    include: reportIncludes,
  });
};

export const update = async (
  id: string,
  data: {
    status?: ReportStatus;
    fileUrl?: string | null;
    generatedAt?: Date | null;
    approvedById?: string | null;
    approvedAt?: Date | null;
    notes?: string | null;
  },
) => {
  return prisma.report.update({
    where: { id },
    data,
    include: reportIncludes,
  });
};

export const updateStatus = async (
  id: string,
  status: ReportStatus,
  extraData?: Record<string, unknown>,
) => {
  return prisma.report.update({
    where: { id },
    data: { status, ...extraData },
    include: reportIncludes,
  });
};

export const softDelete = async (id: string) => {
  return prisma.report.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
