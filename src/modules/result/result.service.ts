import * as resultRepository from './result.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import {
  CreateResultInput,
  EnterResultInput,
  VerifyResultInput,
  RejectResultInput,
} from './result.validators.js';
import { ResultStatus } from '@prisma/client';
import { createStateMachine, RESULT_WORKFLOW, ResultState } from '../../core/state-machine.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { createAuditLog } from '../../shared/utils/audit.js';
import { env } from '../../config/env.js';

const resultMachine = createStateMachine<ResultState>(RESULT_WORKFLOW);

/**
 * Create a result placeholder for a test order
 * This initializes the result entry workflow
 */
export const createResult = async (data: CreateResultInput) => {
  // Verify test order exists
  const testOrder = await prisma.testOrder.findUnique({
    where: { id: data.testOrderId, deletedAt: null },
  });

  if (!testOrder) {
    throw new NotFoundError('Test order not found');
  }

  // Check if result already exists
  const existingResult = await resultRepository.findByTestOrderId(data.testOrderId);
  if (existingResult) {
    throw new ConflictError('Result already exists for this test order');
  }

  // Create result
  const result = await resultRepository.create({ ...data, tenantId: env.DEFAULT_TENANT_ID });

  return result;
};

/**
 * Get result by ID
 */
export const getResultById = async (resultId: string) => {
  const result = await resultRepository.findById(resultId);

  if (!result) {
    throw new NotFoundError('Result not found');
  }

  return result;
};

/**
 * Get result by test order ID
 */
export const getResultByTestOrder = async (testOrderId: string) => {
  const result = await resultRepository.findByTestOrderId(testOrderId);

  if (!result) {
    throw new NotFoundError('Result not found for this test order');
  }

  return result;
};

/**
 * List all results with optional filters
 */
export const listResults = async (
  pagination: PaginationParams,
  filters?: { status?: ResultStatus; visitId?: string },
) => {
  return resultRepository.findAll(pagination, filters);
};

/**
 * Enter result values
 * Lab technician enters the numeric/value result
 * This marks result as ENTERED (pending verification)
 */
export const enterResult = async (
  resultId: string,
  data: EnterResultInput,
  enteredByUserId: string,
) => {
  const existingResult = await resultRepository.findById(resultId);
  if (!existingResult) {
    throw new NotFoundError('Result not found');
  }

  // Use state machine
  await resultMachine.transition(existingResult.status as ResultState, 'ENTERED', {
    entityId: resultId,
    userId: enteredByUserId,
    role: 'LAB_TECHNICIAN',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  // Update result with values
  const updatedResult = await resultRepository.update(resultId, {
    value: data.value,
    unit: data.unit ?? null,
    referenceRange: data.referenceRange ?? null,
    isAbnormal: data.isAbnormal,
    remarks: data.remarks ?? null,
    status: ResultStatus.ENTERED,
    enteredById: enteredByUserId,
    enteredAt: new Date(),
  });

  // Audit
  await createAuditLog({
    userId: enteredByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.RESULT_ENTERED,
    entity: 'Result',
    entityId: resultId,
    newValue: {
      status: updatedResult.status,
      value: updatedResult.value,
      isAbnormal: updatedResult.isAbnormal,
    },
  });

  // Domain event — notifies pathologists
  const testName = (updatedResult as Record<string, unknown>).testOrder
    ? ((updatedResult as Record<string, unknown>).testOrder as Record<string, unknown>).test
      ? ((
          ((updatedResult as Record<string, unknown>).testOrder as Record<string, unknown>)
            .test as Record<string, unknown>
        ).name as string)
      : 'Test'
    : 'Test';
  await eventBus.emit({
    type: EVENTS.RESULT_ENTERED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Result',
    entityId: resultId,
    userId: enteredByUserId,
    payload: { testName, value: data.value, isAbnormal: data.isAbnormal },
  });

  return updatedResult;
};

/**
 * Verify/approve result
 * Pathologist reviews entered result and confirms correctness
 * This locks the result for reporting
 */
export const verifyResult = async (
  resultId: string,
  data: VerifyResultInput,
  verifiedByUserId: string,
) => {
  const existingResult = await resultRepository.findById(resultId);
  if (!existingResult) {
    throw new NotFoundError('Result not found');
  }

  // Use state machine
  await resultMachine.transition(existingResult.status as ResultState, 'VERIFIED', {
    entityId: resultId,
    userId: verifiedByUserId,
    role: 'PATHOLOGIST',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  // Check that result has values
  if (!existingResult.value) {
    throw new ConflictError('Cannot verify result without values');
  }

  // Update result with verification
  const updatedResult = await resultRepository.update(resultId, {
    status: ResultStatus.VERIFIED,
    isAbnormal: data.isAbnormal !== undefined ? data.isAbnormal : existingResult.isAbnormal,
    remarks: data.remarks !== undefined ? (data.remarks ?? null) : (existingResult.remarks ?? null),
    verifiedById: verifiedByUserId,
    verifiedAt: new Date(),
  });

  // Audit
  await createAuditLog({
    userId: verifiedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.RESULT_VERIFIED,
    entity: 'Result',
    entityId: resultId,
    newValue: {
      status: updatedResult.status,
      verifiedAt: updatedResult.verifiedAt,
      isAbnormal: updatedResult.isAbnormal,
    },
  });

  // Domain event — triggers auto-report creation + visit completion via event handler
  const visitId = updatedResult.testOrder?.visit?.id ?? '';
  await eventBus.emit({
    type: EVENTS.RESULT_VERIFIED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Result',
    entityId: resultId,
    userId: verifiedByUserId,
    payload: { visitId },
  });

  return updatedResult;
};

/**
 * Reject result
 * Result was entered incorrectly and needs re-entry
 */
export const rejectResult = async (
  resultId: string,
  data: RejectResultInput,
  rejectedByUserId: string,
) => {
  const existingResult = await resultRepository.findById(resultId);
  if (!existingResult) {
    throw new NotFoundError('Result not found');
  }

  // Use state machine
  await resultMachine.transition(existingResult.status as ResultState, 'REJECTED', {
    entityId: resultId,
    userId: rejectedByUserId,
    role: 'PATHOLOGIST',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  // Update result as rejected
  const updatedResult = await resultRepository.update(resultId, {
    status: ResultStatus.REJECTED,
    rejectionReason: data.rejectionReason,
    value: '',
    remarks: null,
    enteredById: null,
    enteredAt: null,
  });

  // Audit
  await createAuditLog({
    userId: rejectedByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.RESULT_REJECTED,
    entity: 'Result',
    entityId: resultId,
    oldValue: { status: existingResult.status },
    newValue: { status: updatedResult.status, rejectionReason: data.rejectionReason },
  });

  // Domain event
  await eventBus.emit({
    type: EVENTS.RESULT_REJECTED,
    tenantId: env.DEFAULT_TENANT_ID,
    entity: 'Result',
    entityId: resultId,
    userId: rejectedByUserId,
    payload: { rejectionReason: data.rejectionReason },
  });

  return updatedResult;
};

/**
 * Re-enter rejected result
 * After rejection, lab tech can re-enter the result
 * Returns result to PENDING state
 */
export const reEnterResult = async (
  resultId: string,
  data: EnterResultInput,
  enteredByUserId: string,
) => {
  // Verify result exists
  const existingResult = await resultRepository.findById(resultId);
  if (!existingResult) {
    throw new NotFoundError('Result not found');
  }

  // Check that result is REJECTED
  if (existingResult.status !== ResultStatus.REJECTED) {
    throw new ConflictError(
      `Cannot re-enter result in ${existingResult.status} status. Only REJECTED results can be re-entered.`,
    );
  }

  // Update result with new values
  const updatedResult = await resultRepository.update(resultId, {
    value: data.value,
    unit: data.unit ?? null,
    referenceRange: data.referenceRange ?? null,
    isAbnormal: data.isAbnormal,
    remarks: data.remarks ?? null,
    status: ResultStatus.ENTERED,
    enteredById: enteredByUserId,
    enteredAt: new Date(),
    rejectionReason: null,
  });

  // Audit
  await createAuditLog({
    userId: enteredByUserId,
    action: CONSTANTS.AUDIT_ACTIONS.RESULT_ENTERED,
    entity: 'Result',
    entityId: resultId,
    newValue: { status: updatedResult.status, value: updatedResult.value },
  });

  return updatedResult;
};
