import * as sampleRepository from './sample.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import {
  CreateSampleInput,
  RecordSampleCollectionInput,
  RejectSampleInput,
  UpdateSampleStatusInput,
} from './sample.validators.js';
import { SampleStatus } from '@prisma/client';
import crypto from 'crypto';
import { createStateMachine, SAMPLE_WORKFLOW, SampleState } from '../../core/state-machine.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { createAuditLog } from '../../shared/utils/audit.js';
import { env } from '../../config/env.js';

const sampleMachine = createStateMachine<SampleState>(SAMPLE_WORKFLOW);

/**
 * Create a sample (initialize sample collection task)
 * Called when a lab tech is ready to collect a sample for a test order
 */
export const createSample = async (data: CreateSampleInput) => {
  // Verify test order exist and doesn't already have a sample
  const testOrder = await prisma.testOrder.findUnique({
    where: { id: data.testOrderId, deletedAt: null },
    include: { sample: true },
  });

  if (!testOrder) {
    throw new NotFoundError('Test order not found');
  }

  if (testOrder.sample) {
    throw new ConflictError('Sample already exists for this test order');
  }

  // Check for duplicate barcode
  const existingBarcode = await sampleRepository.findByBarcode(data.barcode);
  if (existingBarcode) {
    throw new ConflictError('A sample with this barcode already exists');
  }

  // Create sample
  const sample = await sampleRepository.create({ ...data, tenantId: env.DEFAULT_TENANT_ID });

  return sample;
};

/**
 * Get sample by ID
 */
export const getSampleById = async (sampleId: string) => {
  const sample = await sampleRepository.findById(sampleId);

  if (!sample) {
    throw new NotFoundError('Sample not found');
  }

  return sample;
};

/**
 * Get sample by barcode
 * Used when lab tech scans barcode
 */
export const getSampleByBarcode = async (barcode: string) => {
  const sample = await sampleRepository.findByBarcode(barcode);

  if (!sample) {
    throw new NotFoundError('Sample not found');
  }

  return sample;
};

/**
 * Get sample for a test order
 */
export const getSampleByTestOrder = async (testOrderId: string) => {
  const sample = await sampleRepository.findByTestOrderId(testOrderId);

  if (!sample) {
    throw new NotFoundError('Sample not found for this test order');
  }

  return sample;
};

/**
 * Quick-collect: create a sample and mark it as collected in one step.
 * Auto-generates barcode and derives sampleType from the test.
 */
export const quickCollect = async (testOrderId: string, userId: string) => {
  const testOrder = await prisma.testOrder.findUnique({
    where: { id: testOrderId, deletedAt: null },
    include: { test: true, sample: true, visit: true },
  });

  if (!testOrder) {
    throw new NotFoundError('Test order not found');
  }

  if (testOrder.sample) {
    throw new ConflictError('Sample already exists for this test order');
  }

  // Auto-generate barcode: CD-SMP-<random>
  const barcode = `CD-SMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const sampleType = testOrder.test?.sampleType ?? 'BLOOD';

  // Create sample and mark collected in one transaction
  const sample = await prisma.sample.create({
    data: {
      tenantId: testOrder.visit?.tenantId ?? env.DEFAULT_TENANT_ID,
      testOrderId,
      barcode,
      sampleType,
      status: SampleStatus.COLLECTED,
      collectedAt: new Date(),
      collectedById: userId,
    },
    include: {
      testOrder: { include: { test: true, visit: { include: { patient: true } } } },
      collectedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Emit sample collected event
  const visitId = testOrder.visit?.id ?? testOrder.visitId;
  await eventBus.emit({
    type: EVENTS.SAMPLE_COLLECTED,
    tenantId: testOrder.visit?.tenantId ?? env.DEFAULT_TENANT_ID,
    entity: 'Sample',
    entityId: sample.id,
    userId,
    payload: { visitId, testOrderId, barcode, sampleType },
  });

  return sample;
};

/**
 * Receive sample in lab — transitions COLLECTED → IN_LAB
 */
export const receiveInLab = async (sampleId: string, userId: string = '') => {
  const sample = await sampleRepository.findById(sampleId);
  if (!sample) {
    throw new NotFoundError('Sample not found');
  }

  // Use state machine
  await sampleMachine.transition(sample.status as SampleState, 'IN_LAB', {
    entityId: sampleId,
    userId,
    role: 'LAB_TECHNICIAN',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  const updated = await sampleRepository.update(sampleId, {
    status: SampleStatus.IN_LAB,
  });

  // Emit event — triggers visit IN_PROGRESS automation
  const visitId = (sample as Record<string, unknown>).testOrder
    ? (((sample as Record<string, unknown>).testOrder as Record<string, unknown>).visitId as string)
    : '';
  await eventBus.emit({
    type: EVENTS.SAMPLE_RECEIVED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Sample',
    entityId: sampleId,
    userId,
    payload: { visitId },
  });

  return updated;
};

/**
 * Mark sample as processed — transitions IN_LAB → PROCESSED
 * Also auto-creates a PENDING result record for the test order
 */
export const markProcessed = async (sampleId: string, userId: string = '') => {
  const sample = await sampleRepository.findById(sampleId);
  if (!sample) {
    throw new NotFoundError('Sample not found');
  }

  // Use state machine
  await sampleMachine.transition(sample.status as SampleState, 'PROCESSED', {
    entityId: sampleId,
    userId,
    role: 'LAB_TECHNICIAN',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  // Use a transaction to update sample + create result atomically
  const updated = await prisma.$transaction(
    async (tx) => {
      const updatedSample = await tx.sample.update({
        where: { id: sampleId, deletedAt: null },
        data: { status: SampleStatus.PROCESSED },
        include: {
          testOrder: { include: { test: true, visit: { include: { patient: true } } } },
          collectedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Auto-create a PENDING result for the test order (if not already existing)
      const existingResult = await tx.result.findFirst({
        where: { testOrderId: updatedSample.testOrderId, deletedAt: null },
      });

      if (!existingResult) {
        await tx.result.create({
          data: {
            tenantId: env.DEFAULT_TENANT_ID,
            testOrderId: updatedSample.testOrderId,
            value: '',
            status: 'PENDING',
          },
        });
      }

      return updatedSample;
    },
    { timeout: 15000 },
  );

  // Emit event
  await eventBus.emit({
    type: EVENTS.SAMPLE_PROCESSED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Sample',
    entityId: sampleId,
    userId,
    payload: { testOrderId: updated.testOrderId },
  });

  return updated;
};

/**
 * List all samples
 */
export const listSamples = async (
  pagination: PaginationParams,
  filters?: { status?: SampleStatus },
) => {
  return sampleRepository.findAll(pagination, filters);
};

/**
 * Record sample collection
 * Lab tech confirms they have collected the sample
 */
export const recordSampleCollection = async (
  sampleId: string,
  data: RecordSampleCollectionInput,
  recordedByUserId: string,
) => {
  // Verify sample exists
  const existingSample = await sampleRepository.findById(sampleId);
  if (!existingSample) {
    throw new NotFoundError('Sample not found');
  }

  // Check that sample is in correct state for collection
  if (existingSample.status !== SampleStatus.PENDING_COLLECTION) {
    throw new ConflictError(
      `Cannot record collection for sample in ${existingSample.status} status`,
    );
  }

  // Update sample with collection info
  const updatedSample = await sampleRepository.update(sampleId, {
    status: SampleStatus.COLLECTED,
    collectedAt: new Date(data.collectedAt),
    collectedById: data.collectedById,
    notes: data.notes || undefined,
  });

  // Audit log
  await createAuditLog({
    userId: recordedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.SAMPLE_COLLECTED,
    entity: 'Sample',
    entityId: sampleId,
    newValue: { status: updatedSample.status, collectedAt: updatedSample.collectedAt },
  });

  // Emit event
  await eventBus.emit({
    type: EVENTS.SAMPLE_COLLECTED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Sample',
    entityId: sampleId,
    userId: recordedByUserId,
    payload: {
      visitId: (existingSample as Record<string, unknown>)?.testOrder
        ? (((existingSample as Record<string, unknown>).testOrder as Record<string, unknown>)
            .visitId as string)
        : '',
    },
  });

  return updatedSample;
};

/**
 * Reject a sample
 * Lab tech marks sample as rejected (broken, contaminated, etc.)
 */
export const rejectSample = async (
  sampleId: string,
  data: RejectSampleInput,
  rejectedByUserId: string,
) => {
  // Verify sample exists
  const existingSample = await sampleRepository.findById(sampleId);
  if (!existingSample) {
    throw new NotFoundError('Sample not found');
  }

  // Can reject if in PENDING_COLLECTION or COLLECTED status
  if (
    existingSample.status !== SampleStatus.PENDING_COLLECTION &&
    existingSample.status !== SampleStatus.COLLECTED
  ) {
    throw new ConflictError(`Cannot reject sample in ${existingSample.status} status`);
  }

  // Update sample as rejected
  const updatedSample = await sampleRepository.update(sampleId, {
    status: SampleStatus.REJECTED,
    rejectionReason: data.rejectionReason,
    notes: data.notes || undefined,
  });

  // Audit log
  await createAuditLog({
    userId: rejectedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.SAMPLE_REJECTED,
    entity: 'Sample',
    entityId: sampleId,
    oldValue: { status: existingSample.status },
    newValue: { status: updatedSample.status, rejectionReason: data.rejectionReason },
  });

  // Emit event
  await eventBus.emit({
    type: EVENTS.SAMPLE_REJECTED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Sample',
    entityId: sampleId,
    userId: rejectedByUserId,
    payload: { rejectionReason: data.rejectionReason },
  });

  return updatedSample;
};

/**
 * Update sample status
 * Track sample through lab workflow: IN_LAB -> PROCESSED
 */
export const updateSampleStatus = async (
  sampleId: string,
  data: UpdateSampleStatusInput,
  updatedByUserId: string,
) => {
  // Verify sample exists
  const existingSample = await sampleRepository.findById(sampleId);
  if (!existingSample) {
    throw new NotFoundError('Sample not found');
  }

  // Use state machine instead of hardcoded validTransitions
  if (existingSample.status !== data.status) {
    await sampleMachine.transition(
      existingSample.status as SampleState,
      data.status as SampleState,
      {
        entityId: sampleId,
        userId: updatedByUserId,
        role: 'LAB_TECHNICIAN',
        tenantId: env.DEFAULT_TENANT_ID,
      },
    );
  }

  // Update status
  const updatedSample = await sampleRepository.updateStatus(sampleId, data.status);

  // Audit log
  await createAuditLog({
    userId: updatedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.SAMPLE_STATUS_UPDATED,
    entity: 'Sample',
    entityId: sampleId,
    oldValue: { status: existingSample.status },
    newValue: { status: updatedSample.status },
  });

  return updatedSample;
};
