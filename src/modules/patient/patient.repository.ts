import { prisma } from '../../config/database.js';
import { Gender, Patient, Prisma } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

export const findByMRN = async (mrn: string): Promise<Patient | null> => {
  return prisma.patient.findUnique({
    where: { mrn, deletedAt: null },
    include: { registeredBy: { select: { id: true, firstName: true, lastName: true } } },
  });
};

export const findById = async (id: string): Promise<Patient | null> => {
  return prisma.patient.findUnique({
    where: { id, deletedAt: null },
    include: { registeredBy: { select: { id: true, firstName: true, lastName: true } } },
  });
};

export const findAll = async (
  pagination: PaginationParams,
  filters?: { searchTerm?: string },
): Promise<{ patients: Patient[]; total: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.PatientWhereInput = {
    deletedAt: null,
    ...(filters?.searchTerm && {
      OR: [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' as const } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' as const } },
        { mrn: { contains: filters.searchTerm, mode: 'insensitive' as const } },
        { email: { contains: filters.searchTerm, mode: 'insensitive' as const } },
        { phone: { contains: filters.searchTerm, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { registeredBy: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.patient.count({ where: whereClause }),
  ]);

  return { patients, total };
};

export const create = async (data: {
  tenantId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  registeredById: string;
}): Promise<Patient> => {
  return prisma.patient.create({
    data,
    include: { registeredBy: { select: { id: true, firstName: true, lastName: true } } },
  });
};

export const update = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    phone?: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  },
): Promise<Patient> => {
  return prisma.patient.update({
    where: { id, deletedAt: null },
    data,
    include: { registeredBy: { select: { id: true, firstName: true, lastName: true } } },
  });
};

export const softDelete = async (id: string): Promise<void> => {
  await prisma.patient.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};
