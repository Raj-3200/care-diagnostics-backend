import * as reportRepository from './report.repository.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import { ReportStatus, ResultStatus, SampleStatus } from '@prisma/client';
import { createStateMachine, REPORT_WORKFLOW, ReportState } from '../../core/state-machine.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { createAuditLog } from '../../shared/utils/audit.js';
import { env } from '../../config/env.js';

const reportMachine = createStateMachine<ReportState>(REPORT_WORKFLOW);

type ReportWithRelations = NonNullable<Awaited<ReturnType<typeof reportRepository.findById>>>;

type ReportableVisit = {
  testOrders: Array<{
    sample: { status: SampleStatus } | null;
    result: { status: ResultStatus; value: string | null } | null;
  }>;
};

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

const getVisitForReport = async (visitId: string) => {
  return prisma.visit.findFirst({
    where: { id: visitId, deletedAt: null },
    include: {
      testOrders: {
        where: { deletedAt: null },
        include: {
          sample: true,
          result: true,
        },
      },
    },
  });
};

const getReportBlockReason = (visit: ReportableVisit): string | null => {
  const testOrders = visit.testOrders ?? [];
  const total = testOrders.length;

  if (total === 0) {
    return 'order at least one test before reporting.';
  }

  const rejectedSamples = testOrders.filter((order) => order.sample?.status === SampleStatus.REJECTED);
  if (rejectedSamples.length > 0) {
    return `resolve ${rejectedSamples.length} rejected sample(s) before reporting.`;
  }

  const collectedSamples = testOrders.filter(
    (order) => order.sample && order.sample.status !== SampleStatus.PENDING_COLLECTION,
  );
  if (collectedSamples.length < total) {
    return `collect all samples first (${collectedSamples.length}/${total} collected).`;
  }

  const processedSamples = testOrders.filter(
    (order) => order.sample?.status === SampleStatus.PROCESSED,
  );
  if (processedSamples.length < total) {
    return `receive and process all samples first (${processedSamples.length}/${total} processed).`;
  }

  const rejectedResults = testOrders.filter((order) => order.result?.status === ResultStatus.REJECTED);
  if (rejectedResults.length > 0) {
    return `resolve ${rejectedResults.length} rejected result(s) before reporting.`;
  }

  const enteredResults = testOrders.filter(
    (order) => order.result && order.result.status !== ResultStatus.PENDING && order.result.value?.trim(),
  );
  if (enteredResults.length < total) {
    return `enter results for all tests first (${enteredResults.length}/${total} entered).`;
  }

  const verifiedResults = testOrders.filter(
    (order) => order.result?.status === ResultStatus.VERIFIED && order.result.value?.trim(),
  );
  if (verifiedResults.length < total) {
    return `verify all entered results first (${verifiedResults.length}/${total} verified).`;
  }

  return null;
};

const ensureVisitReadyForReport = (visit: ReportableVisit, action: string) => {
  const blockReason = getReportBlockReason(visit);
  if (blockReason) {
    throw new ValidationError(`Cannot ${action}: ${blockReason}`);
  }
};

export const ensureReportDownloadable = (report: ReportWithRelations) => {
  if (report.status !== ReportStatus.APPROVED && report.status !== ReportStatus.DISPATCHED) {
    throw new ValidationError('Cannot download report: approve the generated report first.');
  }

  ensureVisitReadyForReport(report.visit, 'download report');
};

/**
 * Create a new report for a visit
 */
export const createReport = async (visitId: string, notes: string | undefined, userId: string) => {
  // Validate visit exists
  const visit = await getVisitForReport(visitId);
  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  // Check if report already exists for this visit
  const existingReport = await reportRepository.findByVisitId(visitId);
  if (existingReport) {
    ensureVisitReadyForReport(existingReport.visit, 'open report');
    return existingReport;
  }

  ensureVisitReadyForReport(visit, 'create report');

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

  ensureVisitReadyForReport(report.visit, 'generate report');

  // Use state machine
  await reportMachine.transition(report.status as ReportState, 'GENERATED', {
    entityId: id,
    userId,
    role: 'LAB_TECHNICIAN',
    tenantId: env.DEFAULT_TENANT_ID,
  });

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

  ensureVisitReadyForReport(report.visit, 'approve report');

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

  ensureVisitReadyForReport(report.visit, 'dispatch report');

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
