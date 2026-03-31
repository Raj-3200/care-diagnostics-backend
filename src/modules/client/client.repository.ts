import { prisma } from '../../config/database.js';
import { Role } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types.js';

type UserWithoutPassword = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const omitPassword = (user: UserWithoutPassword & { password?: string }): UserWithoutPassword => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = user as UserWithoutPassword & { password: string };
  return rest;
};

export const findAllClients = async (
  pagination: PaginationParams,
): Promise<{ clients: UserWithoutPassword[]; total: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.CLIENT, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({
      where: { role: Role.CLIENT, deletedAt: null },
    }),
  ]);

  return { clients: users.map(omitPassword), total };
};

export const findClientById = async (id: string): Promise<UserWithoutPassword | null> => {
  const user = await prisma.user.findFirst({
    where: { id, role: Role.CLIENT, deletedAt: null },
  });
  if (!user) return null;
  return omitPassword(user);
};

export const createClient = async (data: {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<UserWithoutPassword> => {
  const user = await prisma.user.create({
    data: { ...data, role: Role.CLIENT },
  });
  return omitPassword(user);
};

export const updateClient = async (
  id: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive?: boolean;
  },
): Promise<UserWithoutPassword> => {
  const user = await prisma.user.update({
    where: { id, deletedAt: null },
    data,
  });
  return omitPassword(user);
};

export const softDeleteClient = async (id: string): Promise<void> => {
  await prisma.user.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
};

// Client Reports
export const findClientReports = async (clientId: string, pagination: PaginationParams) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    prisma.clientReport.findMany({
      where: { clientId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.clientReport.count({
      where: { clientId, deletedAt: null },
    }),
  ]);

  return { reports, total };
};

export const createClientReport = async (data: {
  tenantId: string;
  clientId: string;
  patientId?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedById: string;
}) => {
  return prisma.clientReport.create({
    data,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

export const findClientReportById = async (id: string) => {
  return prisma.clientReport.findFirst({
    where: { id, deletedAt: null },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
};

export const deleteClientReport = async (id: string): Promise<void> => {
  await prisma.clientReport.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

// Client Patients
export const findClientPatients = async (clientId: string, pagination: PaginationParams) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where: { referredByClientId: clientId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        registeredBy: { select: { id: true, firstName: true, lastName: true } },
        visits: {
          where: { deletedAt: null },
          select: { id: true, visitNumber: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.patient.count({
      where: { referredByClientId: clientId, deletedAt: null },
    }),
  ]);

  return { patients, total };
};
