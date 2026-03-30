import { prisma } from '../../config/database.js';
import { ResultStatus, Prisma } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

const resultIncludes = {
  testOrder: { include: { test: true, visit: { include: { patient: true } } } },
  enteredBy: { select: { id: true, firstName: true, lastName: true } },
  verifiedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export const findById = async (id: string) => {
  return prisma.result.findUnique({
    where: { id, deletedAt: null },
    include: resultIncludes,
  });
};

export const findByTestOrderId = async (testOrderId: string) => {
  return prisma.result.findUnique({
    where: { testOrderId, deletedAt: null },
    include: resultIncludes,
  });
};

export const findAll = async (
  pagination: PaginationParams,
  filters?: { status?: ResultStatus; visitId?: string },
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.ResultWhereInput = {
    deletedAt: null,
  };

  if (filters?.status) whereClause.status = filters.status;
  if (filters?.visitId) {
    whereClause.testOrder = { visit: { id: filters.visitId } };
  }

  const [results, total] = await Promise.all([
    prisma.result.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: resultIncludes,
    }),
    prisma.result.count({ where: whereClause }),
  ]);

  return { results, total };
};

export const create = async (data: { tenantId: string; testOrderId: string; value?: string }) => {
  return prisma.result.create({
    data: {
      tenantId: data.tenantId,
      testOrderId: data.testOrderId,
      value: data.value || '',
    },
    include: resultIncludes,
  });
};

export const update = async (
  id: string,
  data: {
    value?: string;
    unit?: string | null;
    referenceRange?: string | null;
    isAbnormal?: boolean;
    remarks?: string | null;
    status?: ResultStatus;
    enteredById?: string | null;
    enteredAt?: Date | null;
    verifiedById?: string | null;
    verifiedAt?: Date | null;
    rejectionReason?: string | null;
  },
) => {
  return prisma.result.update({
    where: { id, deletedAt: null },
    data,
    include: resultIncludes,
  });
};

export const updateStatus = async (id: string, status: ResultStatus) => {
  return prisma.result.update({
    where: { id, deletedAt: null },
    data: { status },
    include: resultIncludes,
  });
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.result.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};
