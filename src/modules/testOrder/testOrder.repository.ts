import { prisma } from '../../config/database.js';
import { TestOrder } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

export type TestOrderWithRelations = TestOrder & {
  visit?: Record<string, unknown>;
  test?: Record<string, unknown>;
  sample?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
};

export const findById = async (id: string): Promise<TestOrderWithRelations | null> => {
  return prisma.testOrder.findUnique({
    where: { id, deletedAt: null },
    include: {
      visit: { include: { patient: true } },
      test: true,
      sample: true,
      result: true,
    },
  });
};

export const findByVisitId = async (visitId: string): Promise<TestOrderWithRelations[]> => {
  return prisma.testOrder.findMany({
    where: { visitId, deletedAt: null },
    include: {
      test: true,
      sample: true,
      result: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const findAll = async (
  pagination: PaginationParams,
): Promise<{ testOrders: TestOrderWithRelations[]; total: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [testOrders, total] = await Promise.all([
    prisma.testOrder.findMany({
      where: { deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        visit: { include: { patient: true } },
        test: true,
        sample: true,
        result: true,
      },
    }),
    prisma.testOrder.count({ where: { deletedAt: null } }),
  ]);

  return { testOrders, total };
};

export const create = async (data: {
  tenantId: string;
  visitId: string;
  testId: string;
  priority?: string;
  notes?: string;
}): Promise<TestOrderWithRelations> => {
  return prisma.testOrder.create({
    data: {
      ...data,
      priority: data.priority || 'NORMAL',
    },
    include: {
      visit: { include: { patient: true } },
      test: true,
      sample: true,
      result: true,
    },
  });
};

export const update = async (
  id: string,
  data: {
    priority?: string;
    notes?: string;
  },
): Promise<TestOrderWithRelations> => {
  return prisma.testOrder.update({
    where: { id, deletedAt: null },
    data,
    include: {
      visit: { include: { patient: true } },
      test: true,
      sample: true,
      result: true,
    },
  });
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.testOrder.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};
