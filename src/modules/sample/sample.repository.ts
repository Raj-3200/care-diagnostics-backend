import { prisma } from '../../config/database.js';
import { SampleStatus, SampleType, Prisma } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

const sampleIncludes = {
  testOrder: { include: { test: true, visit: { include: { patient: true } } } },
  collectedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export const findById = async (id: string) => {
  return prisma.sample.findUnique({
    where: { id, deletedAt: null },
    include: sampleIncludes,
  });
};

export const findByBarcode = async (barcode: string) => {
  return prisma.sample.findUnique({
    where: { barcode, deletedAt: null },
    include: sampleIncludes,
  });
};

export const findByTestOrderId = async (testOrderId: string) => {
  return prisma.sample.findUnique({
    where: { testOrderId, deletedAt: null },
    include: sampleIncludes,
  });
};

export const findAll = async (
  pagination: PaginationParams,
  filters?: { status?: SampleStatus },
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.SampleWhereInput = {
    deletedAt: null,
  };

  if (filters?.status) whereClause.status = filters.status;

  const [samples, total] = await Promise.all([
    prisma.sample.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: sampleIncludes,
    }),
    prisma.sample.count({ where: whereClause }),
  ]);

  return { samples, total };
};

export const create = async (data: {
  tenantId: string;
  testOrderId: string;
  barcode: string;
  sampleType: SampleType;
  notes?: string | null;
}) => {
  return prisma.sample.create({
    data: {
      tenantId: data.tenantId,
      testOrderId: data.testOrderId,
      barcode: data.barcode,
      sampleType: data.sampleType,
      ...(data.notes != null && { notes: data.notes }),
    },
    include: sampleIncludes,
  });
};

export const update = async (
  id: string,
  data: {
    status?: SampleStatus;
    collectedAt?: Date;
    collectedById?: string;
    rejectionReason?: string;
    notes?: string;
  },
) => {
  return prisma.sample.update({
    where: { id, deletedAt: null },
    data,
    include: sampleIncludes,
  });
};

export const updateStatus = async (id: string, status: SampleStatus) => {
  return prisma.sample.update({
    where: { id, deletedAt: null },
    data: { status },
    include: sampleIncludes,
  });
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.sample.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};
