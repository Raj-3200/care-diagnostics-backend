import * as visitRepository from './visit.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import { CreateVisitInput, UpdateVisitInput } from './visit.validators.js';
import { VisitStatus } from '@prisma/client';
import { createStateMachine, VISIT_WORKFLOW, VisitState } from '../../core/state-machine.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { createAuditLog } from '../../shared/utils/audit.js';
import { env } from '../../config/env.js';

const visitMachine = createStateMachine<VisitState>(VISIT_WORKFLOW);

/**
 * Generate unique visit number in format: CD-VIS-YYYYMMDD-XXXX
 * This provides a human-readable, sortable visit identifier for lab staff
 */
const generateVisitNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `CD-VIS-${dateStr}-`;

  // Find the last visit number with this prefix to avoid race conditions
  const lastVisit = await prisma.visit.findFirst({
    where: { visitNumber: { startsWith: prefix } },
    orderBy: { visitNumber: 'desc' },
  });

  let sequence = 1;
  if (lastVisit) {
    const parts = lastVisit.visitNumber.split('-');
    sequence = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

/**
 * Create a new visit for a patient
 * This is called when patient arrives at the lab for testing
 * Each visit can have multiple tests ordered
 */
export const createVisit = async (data: CreateVisitInput, createdByUserId: string) => {
  // Verify patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId, deletedAt: null },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  // Generate unique visit number
  const visitNumber = await generateVisitNumber();

  // Create visit
  const visit = await visitRepository.create({
    tenantId: env.DEFAULT_TENANT_ID,
    visitNumber,
    patientId: data.patientId,
    createdById: createdByUserId,
    notes: data.notes || undefined,
  });

  // Audit + domain event
  await createAuditLog({
    userId: createdByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.VISIT_CREATED,
    entity: 'Visit',
    entityId: visit.id,
    newValue: { visitNumber: visit.visitNumber, patientId: visit.patientId, status: visit.status },
  });

  await eventBus.emit({
    type: EVENTS.VISIT_CREATED,
    tenantId: patient.tenantId ?? env.DEFAULT_TENANT_ID,
    entity: 'Visit',
    entityId: visit.id,
    userId: createdByUserId,
    payload: {
      visitNumber: visit.visitNumber,
      patientId: visit.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
    },
  });

  return visit;
};

/**
 * Get visit by ID
 */
export const getVisitById = async (visitId: string) => {
  const visit = await visitRepository.findById(visitId);

  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  return visit;
};

/**
 * Get visit by visit number
 * Useful for lab staff looking up visits from paper forms/barcodes
 */
export const getVisitByNumber = async (visitNumber: string) => {
  const visit = await visitRepository.findByVisitNumber(visitNumber);

  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  return visit;
};

/**
 * Get all visits for a patient
 * Shows patient's visit history
 */
export const getPatientVisits = async (patientId: string, pagination: PaginationParams) => {
  // Verify patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: patientId, deletedAt: null },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  return visitRepository.findByPatientId(patientId, pagination);
};

/**
 * List all visits with optional filters
 * Access: Staff view of all visits
 */
export const getAllVisits = async (
  pagination: PaginationParams,
  filters?: { status?: VisitStatus; patientId?: string },
) => {
  return visitRepository.findAll(pagination, filters);
};

/**
 * Update visit status
 * Workflow progression: REGISTERED → SAMPLES_COLLECTED → IN_PROGRESS → COMPLETED
 * Or mark as CANCELLED if needed
 */
export const updateVisitStatus = async (
  visitId: string,
  newStatus: VisitStatus,
  updatedByUserId: string,
  role: string = 'ADMIN',
) => {
  // Verify visit exists
  const existingVisit = await visitRepository.findById(visitId);
  if (!existingVisit) {
    throw new NotFoundError('Visit not found');
  }

  // Use state machine for validation (replaces hardcoded validTransitions)
  await visitMachine.transition(existingVisit.status as VisitState, newStatus as VisitState, {
    entityId: visitId,
    userId: updatedByUserId,
    role,
    tenantId: env.DEFAULT_TENANT_ID,
  });

  // Update status
  const updatedVisit = await visitRepository.updateStatus(visitId, newStatus);

  // Audit log
  await createAuditLog({
    userId: updatedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.VISIT_UPDATED,
    entity: 'Visit',
    entityId: visitId,
    oldValue: { status: existingVisit.status },
    newValue: { status: updatedVisit.status },
  });

  // Domain event
  await eventBus.emit({
    type: EVENTS.VISIT_STATUS_CHANGED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Visit',
    entityId: visitId,
    userId: updatedByUserId,
    payload: { oldStatus: existingVisit.status, newStatus: updatedVisit.status },
  });

  return updatedVisit;
};

/**
 * Update visit (notes, etc.)
 */
export const updateVisit = async (
  visitId: string,
  data: UpdateVisitInput,
  updatedByUserId: string,
) => {
  // Verify visit exists
  const existingVisit = await visitRepository.findById(visitId);
  if (!existingVisit) {
    throw new NotFoundError('Visit not found');
  }

  // Prepare update data
  const updateData: { notes?: string; status?: VisitStatus } = {};
  if (data.notes !== undefined && data.notes !== null) {
    updateData.notes = data.notes;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  // Update visit
  const updatedVisit = await visitRepository.update(visitId, updateData);

  // Audit log
  await createAuditLog({
    userId: updatedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.VISIT_UPDATED,
    entity: 'Visit',
    entityId: visitId,
    oldValue: existingVisit as unknown as Record<string, unknown>,
    newValue: updatedVisit as unknown as Record<string, unknown>,
  });

  return updatedVisit;
};

/**
 * Delete (soft delete) visit
 * In medical systems, records are never deleted - only marked as deleted
 */
export const deleteVisit = async (visitId: string, deletedByUserId: string) => {
  // Verify visit exists
  const existingVisit = await visitRepository.findById(visitId);
  if (!existingVisit) {
    throw new NotFoundError('Visit not found');
  }

  // Only allow deletion if no test orders exist
  const testOrderCount = await prisma.testOrder.count({
    where: { visitId, deletedAt: null },
  });

  if (testOrderCount > 0) {
    throw new ConflictError(
      'Cannot delete visit with test orders. Please cancel test orders first.',
    );
  }

  // Soft delete
  await visitRepository.softDelete(visitId);

  // Audit log
  await createAuditLog({
    userId: deletedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.VISIT_UPDATED,
    entity: 'Visit',
    entityId: visitId,
    newValue: { status: 'DELETED' },
  });
};
