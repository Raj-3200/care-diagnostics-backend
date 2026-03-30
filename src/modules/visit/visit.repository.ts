import { prisma } from '../../config/database.js';
import { VisitStatus, Prisma } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

const visitIncludes = {
  patient: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  testOrders: { where: { deletedAt: null } },
} as const;

export const findById = async (id: string) => {
  return prisma.visit.findUnique({
    where: { id, deletedAt: null },
    include: visitIncludes,
  });
};

export const findByVisitNumber = async (visitNumber: string) => {
  return prisma.visit.findUnique({
    where: { visitNumber, deletedAt: null },
    include: visitIncludes,
  });
};

export const findByPatientId = async (patientId: string, pagination: PaginationParams) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where: { patientId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: visitIncludes,
    }),
    prisma.visit.count({
      where: { patientId, deletedAt: null },
    }),
  ]);

  return { visits, total };
};

export const findAll = async (
  pagination: PaginationParams,
  filters?: { status?: VisitStatus; patientId?: string },
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.VisitWhereInput = {
    deletedAt: null,
  };

  if (filters?.status) whereClause.status = filters.status;
  if (filters?.patientId) whereClause.patientId = filters.patientId;

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: visitIncludes,
    }),
    prisma.visit.count({ where: whereClause }),
  ]);

  return { visits, total };
};

export const create = async (data: {
  tenantId: string;
  visitNumber: string;
  patientId: string;
  createdById: string;
  notes?: string;
}) => {
  return prisma.visit.create({
    data,
    include: visitIncludes,
  });
};

export const updateStatus = async (id: string, status: VisitStatus) => {
  return prisma.visit.update({
    where: { id, deletedAt: null },
    data: { status },
    include: visitIncludes,
  });
};

export const update = async (
  id: string,
  data: {
    notes?: string;
    status?: VisitStatus;
  },
) => {
  return prisma.visit.update({
    where: { id, deletedAt: null },
    data,
    include: visitIncludes,
  });
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.visit.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};
