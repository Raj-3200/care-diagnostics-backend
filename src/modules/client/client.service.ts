import * as clientRepo from './client.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { hashPassword } from '../../shared/utils/password.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import { env } from '../../config/env.js';
import { CreateClientInput, UpdateClientInput } from './client.validators.js';

export const createClient = async (data: CreateClientInput, createdByUserId?: string) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError('User with this email already exists');
  }

  const hashedPassword = await hashPassword(data.password);

  const client = await clientRepo.createClient({
    ...data,
    tenantId: env.DEFAULT_TENANT_ID,
    password: hashedPassword,
  });

  if (createdByUserId) {
    await prisma.auditLog.create({
      data: {
        userId: createdByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_CREATED,
        entity: 'User',
        entityId: client.id,
        newValue: { email: client.email, role: 'CLIENT' },
      },
    });
  }

  return client;
};

export const getAllClients = async (pagination: PaginationParams) => {
  return clientRepo.findAllClients(pagination);
};

export const getClientById = async (id: string) => {
  const client = await clientRepo.findClientById(id);
  if (!client) throw new NotFoundError('Client not found');
  return client;
};

export const updateClient = async (
  id: string,
  data: UpdateClientInput,
  updatedByUserId?: string,
) => {
  const existing = await clientRepo.findClientById(id);
  if (!existing) throw new NotFoundError('Client not found');

  if (data.email && data.email !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: data.email } });
    if (dup) throw new ConflictError('User with this email already exists');
  }

  const client = await clientRepo.updateClient(id, data);

  if (updatedByUserId) {
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_UPDATED,
        entity: 'User',
        entityId: client.id,
        oldValue: { email: existing.email },
        newValue: { email: client.email },
      },
    });
  }

  return client;
};

export const deleteClient = async (id: string, deletedByUserId?: string) => {
  const existing = await clientRepo.findClientById(id);
  if (!existing) throw new NotFoundError('Client not found');

  await clientRepo.softDeleteClient(id);

  if (deletedByUserId) {
    await prisma.auditLog.create({
      data: {
        userId: deletedByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_UPDATED,
        entity: 'User',
        entityId: id,
        oldValue: { email: existing.email, role: 'CLIENT' },
      },
    });
  }
};

// --- Client Reports ---

export const getClientReports = async (clientId: string, pagination: PaginationParams) => {
  // Verify client exists
  const client = await clientRepo.findClientById(clientId);
  if (!client) throw new NotFoundError('Client not found');
  return clientRepo.findClientReports(clientId, pagination);
};

export const uploadReport = async (
  data: {
    clientId: string;
    patientId?: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
  },
  uploadedByUserId: string,
) => {
  const client = await clientRepo.findClientById(data.clientId);
  if (!client) throw new NotFoundError('Client not found');

  return clientRepo.createClientReport({
    ...data,
    tenantId: env.DEFAULT_TENANT_ID,
    uploadedById: uploadedByUserId,
  });
};

export const getReportById = async (id: string) => {
  const report = await clientRepo.findClientReportById(id);
  if (!report) throw new NotFoundError('Report not found');
  return report;
};

export const deleteReport = async (id: string) => {
  const report = await clientRepo.findClientReportById(id);
  if (!report) throw new NotFoundError('Report not found');
  await clientRepo.deleteClientReport(id);
};

/** Get reports for the currently logged-in client */
export const getMyReports = async (clientId: string, pagination: PaginationParams) => {
  return clientRepo.findClientReports(clientId, pagination);
};

/** Get patients referred by a specific client (admin) */
export const getClientPatients = async (clientId: string, pagination: PaginationParams) => {
  const client = await clientRepo.findClientById(clientId);
  if (!client) throw new NotFoundError('Client not found');
  return clientRepo.findClientPatients(clientId, pagination);
};

/** Get patients referred by the currently logged-in client */
export const getMyPatients = async (clientId: string, pagination: PaginationParams) => {
  return clientRepo.findClientPatients(clientId, pagination);
};
