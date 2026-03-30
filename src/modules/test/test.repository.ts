import { prisma } from '../../config/database.js';
import { Test, TestCategory, SampleType, Prisma } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

export const findByCode = async (code: string): Promise<Test | null> => {
  return prisma.test.findUnique({
    where: { code, deletedAt: null },
  });
};

export const findById = async (id: string): Promise<Test | null> => {
  return prisma.test.findUnique({
    where: { id, deletedAt: null },
  });
};

export const findAll = async (
  pagination: PaginationParams,
  filters?: { category?: TestCategory; isActive?: boolean; searchTerm?: string },
): Promise<{ tests: Test[]; total: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.TestWhereInput = {
    deletedAt: null,
  };

  if (filters?.category) whereClause.category = filters.category;
  if (filters?.isActive !== undefined) whereClause.isActive = filters.isActive;
  if (filters?.searchTerm) {
    whereClause.OR = [
      { name: { contains: filters.searchTerm, mode: 'insensitive' } },
      { code: { contains: filters.searchTerm, mode: 'insensitive' } },
      { description: { contains: filters.searchTerm, mode: 'insensitive' } },
    ];
  }

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { code: 'asc' },
    }),
    prisma.test.count({ where: whereClause }),
  ]);

  return { tests, total };
};

export const create = async (data: {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category: TestCategory;
  sampleType: SampleType;
  price: number;
  turnaroundTime: string;
  department?: string;
  instructions?: string;
}): Promise<Test> => {
  return prisma.test.create({
    data,
  });
};

export const update = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: TestCategory;
    sampleType?: SampleType;
    price?: number;
    turnaroundTime?: string;
    department?: string;
    instructions?: string;
    isActive?: boolean;
  },
): Promise<Test> => {
  return prisma.test.update({
    where: { id, deletedAt: null },
    data,
  });
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.test.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};

export const findByCategory = async (
  category: TestCategory,
  pagination: PaginationParams,
): Promise<{ tests: Test[]; total: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where: { category, isActive: true, deletedAt: null },
      skip,
      take: limit,
      orderBy: { code: 'asc' },
    }),
    prisma.test.count({ where: { category, isActive: true, deletedAt: null } }),
  ]);

  return { tests, total };
};
