/**
 * Domain event handlers — wired up on server start.
 * Implements automation: notifications, auto-report creation,
 * visit status progression, etc.
 */

import { eventBus, EVENTS, DomainEvent } from './event-bus.js';
import { prisma } from '../config/database.js';
import { ResultStatus, VisitStatus } from '@prisma/client';

export function registerEventHandlers(): void {
  // ─── When all samples collected → update visit status ───
  eventBus.on(EVENTS.SAMPLE_COLLECTED, async (event: DomainEvent) => {
    try {
      const visitId = event.payload.visitId as string;
      if (!visitId) return;

      const testOrders = await prisma.testOrder.findMany({
        where: { visitId, deletedAt: null },
        include: { sample: true },
      });

      const allCollected =
        testOrders.length > 0 &&
        testOrders.every((to) => to.sample && to.sample.status !== 'PENDING_COLLECTION');

      if (allCollected) {
        const visit = await prisma.visit.findUnique({ where: { id: visitId } });
        if (visit && visit.status === 'REGISTERED') {
          await prisma.visit.update({
            where: { id: visitId },
            data: { status: 'SAMPLES_COLLECTED' },
          });
        }
      }
    } catch (err) {
      console.error('[EventHandler] sample.collected handler error:', err);
    }
  });

  // ─── When sample received in lab → update visit to IN_PROGRESS ───
  eventBus.on(EVENTS.SAMPLE_RECEIVED, async (event: DomainEvent) => {
    try {
      const visitId = event.payload.visitId as string;
      if (!visitId) return;

      const visit = await prisma.visit.findUnique({ where: { id: visitId } });
      if (visit && visit.status === 'SAMPLES_COLLECTED') {
        await prisma.visit.update({
          where: { id: visitId },
          data: { status: 'IN_PROGRESS' },
        });
      }
    } catch (err) {
      console.error('[EventHandler] sample.received handler error:', err);
    }
  });

  // ─── When result verified → auto-create report if all verified ───
  eventBus.on(EVENTS.RESULT_VERIFIED, async (event: DomainEvent) => {
    try {
      const visitId = event.payload.visitId as string;
      const tenantId = event.tenantId;
      if (!visitId) return;

      const testOrders = await prisma.testOrder.findMany({
        where: { visitId, deletedAt: null },
        include: { result: true },
      });

      const allVerified =
        testOrders.length > 0 &&
        testOrders.every((to) => to.result && to.result.status === ResultStatus.VERIFIED);

      if (!allVerified) return;

      // Check if report already exists
      const existing = await prisma.report.findUnique({ where: { visitId } });
      if (existing) return;

      // Generate report number
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
      let seq = 1;
      if (lastReport) {
        const parts = lastReport.reportNumber.split('-');
        seq = parseInt(parts[parts.length - 1], 10) + 1;
      }
      const reportNumber = `${prefix}-${seq.toString().padStart(4, '0')}`;

      await prisma.report.create({
        data: {
          tenantId,
          visitId,
          reportNumber,
          notes: 'Auto-generated after all results verified',
        },
      });

      // Also update visit to COMPLETED
      const visit = await prisma.visit.findUnique({ where: { id: visitId } });
      if (visit && visit.status === VisitStatus.IN_PROGRESS) {
        await prisma.visit.update({
          where: { id: visitId },
          data: { status: VisitStatus.COMPLETED },
        });
      }

      // Notify pathologists about new report
      await createNotification(
        tenantId,
        null,
        'success',
        'Report Ready',
        `Report ${reportNumber} auto-generated and ready for approval`,
        'Report',
        visitId,
      );
    } catch (err) {
      console.error('[EventHandler] result.verified handler error:', err);
    }
  });

  // ─── When result entered → notify pathologists ───
  eventBus.on(EVENTS.RESULT_ENTERED, async (event: DomainEvent) => {
    try {
      const tenantId = event.tenantId;
      const testName = (event.payload.testName as string) || 'Test';

      // Notify all pathologists in this tenant (batch insert)
      const pathologists = await prisma.user.findMany({
        where: { tenantId, role: 'PATHOLOGIST', isActive: true, deletedAt: null },
        select: { id: true },
      });

      if (pathologists.length > 0) {
        await prisma.notification.createMany({
          data: pathologists.map((p) => ({
            tenantId,
            userId: p.id,
            type: 'info',
            title: 'Result Awaiting Verification',
            message: `${testName} result entered and ready for your review`,
            entity: 'Result',
            entityId: event.entityId,
          })),
        });
      }
    } catch (err) {
      console.error('[EventHandler] result.entered handler error:', err);
    }
  });

  // ─── When report approved → notify for dispatch ───
  eventBus.on(EVENTS.REPORT_APPROVED, async (event: DomainEvent) => {
    try {
      const tenantId = event.tenantId;
      await createNotification(
        tenantId,
        null,
        'success',
        'Report Approved',
        `Report approved and ready for dispatch`,
        'Report',
        event.entityId,
      );
    } catch (err) {
      console.error('[EventHandler] report.approved handler error:', err);
    }
  });

  // ─── When visit created → notify lab about incoming ───
  eventBus.on(EVENTS.VISIT_CREATED, async (event: DomainEvent) => {
    try {
      const tenantId = event.tenantId;
      const patientName = (event.payload.patientName as string) || 'Patient';

      await createNotification(
        tenantId,
        null,
        'info',
        'New Visit Registered',
        `${patientName} — new visit awaiting sample collection`,
        'Visit',
        event.entityId,
      );
    } catch (err) {
      console.error('[EventHandler] visit.created handler error:', err);
    }
  });

  console.log('✅ Domain event handlers registered');
}

// ─── Helper ──────────────────────────────────────────────

async function createNotification(
  tenantId: string,
  userId: string | null,
  type: string,
  title: string,
  message: string,
  entity?: string,
  entityId?: string,
) {
  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type,
      title,
      message,
      entity,
      entityId,
    },
  });
}
