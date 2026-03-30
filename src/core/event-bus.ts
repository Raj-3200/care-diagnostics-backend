/**
 * In-process Event Bus with persistence.
 * Emits typed domain events and stores them in the event_logs table.
 * Can be upgraded to Redis Pub/Sub or Kafka without changing callers.
 */

import { EventEmitter } from 'events';
import { prisma } from '../config/database.js';

// ─── Event Types ─────────────────────────────────────────

export const EVENTS = {
  // Visit
  VISIT_CREATED: 'visit.created',
  VISIT_STATUS_CHANGED: 'visit.status.changed',
  // Sample
  SAMPLE_COLLECTED: 'sample.collected',
  SAMPLE_RECEIVED: 'sample.received',
  SAMPLE_PROCESSED: 'sample.processed',
  SAMPLE_REJECTED: 'sample.rejected',
  // Result
  RESULT_ENTERED: 'result.entered',
  RESULT_VERIFIED: 'result.verified',
  RESULT_REJECTED: 'result.rejected',
  // Report
  REPORT_GENERATED: 'report.generated',
  REPORT_APPROVED: 'report.approved',
  REPORT_DISPATCHED: 'report.dispatched',
  // Invoice
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  PAYMENT_RECORDED: 'payment.recorded',
  // Notification
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export interface DomainEvent {
  type: EventType;
  tenantId: string;
  entity: string;
  entityId: string;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// ─── Event Bus ───────────────────────────────────────────

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit a domain event. Persists to event_logs and notifies in-process listeners.
   */
  async emit(event: Omit<DomainEvent, 'timestamp'>): Promise<void> {
    const fullEvent: DomainEvent = { ...event, timestamp: new Date() };

    // Persist to database (fire and forget for non-critical)
    try {
      await prisma.eventLog.create({
        data: {
          tenantId: event.tenantId,
          eventType: event.type,
          entity: event.entity,
          entityId: event.entityId,
          payload: event.payload as unknown as undefined,
        },
      });
    } catch (err) {
      console.error('[EventBus] Failed to persist event:', event.type, err);
    }

    // Emit to in-process listeners
    this.emitter.emit(event.type, fullEvent);
    this.emitter.emit('*', fullEvent); // wildcard listener
  }

  /**
   * Subscribe to a specific event type.
   */
  on(eventType: EventType | '*', handler: (event: DomainEvent) => void | Promise<void>): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Subscribe once.
   */
  once(eventType: EventType, handler: (event: DomainEvent) => void | Promise<void>): void {
    this.emitter.once(eventType, handler);
  }

  /**
   * Unsubscribe.
   */
  off(eventType: EventType | '*', handler: (event: DomainEvent) => void | Promise<void>): void {
    this.emitter.off(eventType, handler);
  }
}

// Singleton
export const eventBus = new EventBus();
