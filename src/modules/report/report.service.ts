import * as reportRepository from './report.repository.js';
import * as visitRepository from '../visit/visit.repository.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import { NotFoundError, ConflictError, ValidationError } from '../../shared/errors/AppError.js';
import { ReportStatus, ResultStatus } from '@prisma/client';
import { createStateMachine, REPORT_WORKFLOW, ReportState } from '../../core/state-machine.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { createAuditLog } from '../../shared/utils/audit.js';
import { env } from '../../config/env.js';

const reportMachine = createStateMachine<ReportState>(REPORT_WORKFLOW);

// Auto-generate report number: CD-RPT-YYYYMMDD-XXXX
const generateReportNumber = async (): Promise<string> => {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  const prefix = `CD-RPT-${dateStr}`;

  const lastReport = await prisma.report.findFirst({
    where: { reportNumber: { startsWith: prefix } },
    orderBy: { reportNumber: 'desc' },
  });

  let sequence = 1;
  if (lastReport) {
    const parts = lastReport.reportNumber.split('-');
    sequence = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
};

/**
 * Create a new report for a visit
 */
export const createReport = async (visitId: string, notes: string | undefined, userId: string) => {
  // Validate visit exists
  const visit = await visitRepository.findById(visitId);
  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  // Check if report already exists for this visit
  const existingReport = await reportRepository.findByVisitId(visitId);
  if (existingReport) {
    throw new ConflictError('Report already exists for this visit');
  }

  const reportNumber = await generateReportNumber();

  const report = await reportRepository.create({
    tenantId: env.DEFAULT_TENANT_ID,
    visitId,
    reportNumber,
    notes,
  });

  // Audit log
  await createAuditLog({
    userId,
    action: CONSTANTS.AUDIT_ACTIONS.REPORT_GENERATED,
    entity: 'Report',
    entityId: report.id,
    newValue: { reportNumber, visitId },
  });

  return report;
};

/**
 * Get report by ID
 */
export const getReportById = async (id: string) => {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }
  return report;
};

/**
 * Get report by report number
 */
export const getReportByNumber = async (reportNumber: string) => {
  const report = await reportRepository.findByReportNumber(reportNumber);
  if (!report) {
    throw new NotFoundError('Report not found');
  }
  return report;
};

/**
 * Get report by visit ID
 */
export const getReportByVisit = async (visitId: string) => {
  const report = await reportRepository.findByVisitId(visitId);
  if (!report) {
    throw new NotFoundError('Report not found for this visit');
  }
  return report;
};

/**
 * List all reports (paginated, filterable)
 */
export const listReports = async (params: {
  page: number;
  limit: number;
  status?: string;
  patientId?: string;
}) => {
  return reportRepository.findAll(params);
};

/**
 * Generate report — moves from PENDING → GENERATED
 * All results for the visit must be verified first
 */
export const generateReport = async (
  id: string,
  data: { fileUrl?: string; notes?: string },
  userId: string,
) => {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  // Use state machine
  await reportMachine.transition(report.status as ReportState, 'GENERATED', {
    entityId: id,
    userId,
    role: 'LAB_TECHNICIAN',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  // Ensure test orders with results all have them verified
  const testOrders = report.visit.testOrders;
  const ordersWithResults = testOrders.filter(
    (to): to is typeof to & { result: NonNullable<typeof to.result> } => to.result !== null,
  );
  const unverifiedResults = ordersWithResults.filter(
    (to) => to.result.status !== ResultStatus.VERIFIED,
  );

  if (ordersWithResults.length === 0) {
    throw new ValidationError(
      'Cannot generate report: no test orders have results yet. Process samples and enter results first.',
    );
  }

  if (unverifiedResults.length > 0) {
    throw new ValidationError(
      `Cannot generate report: ${unverifiedResults.length} result(s) are not yet verified.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.report.update({
      where: { id },
      data: {
        status: ReportStatus.GENERATED,
        fileUrl: data.fileUrl ?? null,
        generatedAt: new Date(),
        notes: data.notes ?? report.notes,
      },
      include: reportRepository.reportIncludes,
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: CONSTANTS.AUDIT_ACTIONS.REPORT_GENERATED,
        entity: 'Report',
        entityId: id,
        oldValue: { status: report.status },
        newValue: { status: ReportStatus.GENERATED },
      },
    });

    // Emit event after transaction
    eventBus
      .emit({
        type: EVENTS.REPORT_GENERATED,
        tenantId: env.DEFAULT_TENANT_ID,
        entity: 'Report',
        entityId: id,
        userId,
        payload: { reportNumber: report.reportNumber, visitId: report.visitId },
      })
      .catch((err) => console.error('[EventBus] report.generated emit failed:', err));

    return updated;
  });
};

/**
 * Approve report — moves from GENERATED → APPROVED
 * Only pathologist can approve
 */
export const approveReport = async (id: string, notes: string | undefined, userId: string) => {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  // Use state machine
  await reportMachine.transition(report.status as ReportState, 'APPROVED', {
    entityId: id,
    userId,
    role: 'PATHOLOGIST',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.report.update({
      where: { id },
      data: {
        status: ReportStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
        notes: notes ?? report.notes,
      },
      include: reportRepository.reportIncludes,
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: CONSTANTS.AUDIT_ACTIONS.REPORT_APPROVED,
        entity: 'Report',
        entityId: id,
        oldValue: { status: report.status },
        newValue: { status: ReportStatus.APPROVED, approvedById: userId },
      },
    });

    // Emit event — triggers notifications
    eventBus
      .emit({
        type: EVENTS.REPORT_APPROVED,
        tenantId: env.DEFAULT_TENANT_ID,
        entity: 'Report',
        entityId: id,
        userId,
        payload: { reportNumber: report.reportNumber, visitId: report.visitId },
      })
      .catch((err) => console.error('[EventBus] report.approved emit failed:', err));

    return updated;
  });
};

/**
 * Dispatch report — moves from APPROVED → DISPATCHED
 */
export const dispatchReport = async (id: string, notes: string | undefined, userId: string) => {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  // Use state machine
  await reportMachine.transition(report.status as ReportState, 'DISPATCHED', {
    entityId: id,
    userId,
    role: 'RECEPTIONIST',
    tenantId: env.DEFAULT_TENANT_ID,
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.report.update({
      where: { id },
      data: {
        status: ReportStatus.DISPATCHED,
        notes: notes ?? report.notes,
      },
      include: reportRepository.reportIncludes,
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: CONSTANTS.AUDIT_ACTIONS.REPORT_DISPATCHED,
        entity: 'Report',
        entityId: id,
        oldValue: { status: report.status },
        newValue: { status: ReportStatus.DISPATCHED },
      },
    });

    // Emit event
    eventBus
      .emit({
        type: EVENTS.REPORT_DISPATCHED,
        tenantId: env.DEFAULT_TENANT_ID,
        entity: 'Report',
        entityId: id,
        userId,
        payload: { reportNumber: report.reportNumber, visitId: report.visitId },
      })
      .catch((err) => console.error('[EventBus] report.dispatched emit failed:', err));

    return updated;
  });
};

/**
 * Delete report (soft delete) — only if PENDING
 */
export const deleteReport = async (id: string, userId: string) => {
  const report = await reportRepository.findById(id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  if (report.status !== ReportStatus.PENDING) {
    throw new ValidationError(
      'Cannot delete report that has already been generated. Only PENDING reports can be deleted.',
    );
  }

  await reportRepository.softDelete(id);

  await createAuditLog({
    userId,
    action: CONSTANTS.AUDIT_ACTIONS.REPORT_DELETED,
    entity: 'Report',
    entityId: id,
    oldValue: { reportNumber: report.reportNumber, status: report.status },
  });
};
