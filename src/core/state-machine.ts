/**
 * Generic, configurable State Machine engine.
 * Enforces valid transitions, supports hooks (onEnter, onExit, guards),
 * and is fully type-safe.
 *
 * Usage:
 *   const visitMachine = createStateMachine(VISIT_WORKFLOW);
 *   visitMachine.transition('REGISTERED', 'SAMPLES_COLLECTED'); // ok
 *   visitMachine.transition('COMPLETED', 'REGISTERED'); // throws
 */

import { ConflictError } from '../shared/errors/AppError.js';

// ─── Types ───────────────────────────────────────────────────

export interface TransitionDef<S extends string> {
  from: S;
  to: S;
  /** Roles that can trigger this transition */
  allowedRoles?: string[];
  /** Guard function — return false or throw to block */
  guard?: (ctx: TransitionContext) => boolean | Promise<boolean>;
}

export interface StateConfig {
  onEnter?: (ctx: TransitionContext) => void | Promise<void>;
  onExit?: (ctx: TransitionContext) => void | Promise<void>;
  /** Terminal state — no outbound transitions */
  terminal?: boolean;
}

export interface WorkflowDefinition<S extends string> {
  name: string;
  states: Record<S, StateConfig>;
  transitions: TransitionDef<S>[];
}

export interface TransitionContext {
  entityId: string;
  userId: string;
  role: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface StateMachine<S extends string> {
  name: string;
  transition: (currentState: S, targetState: S, ctx: TransitionContext) => Promise<S>;
  canTransition: (currentState: S, targetState: S, role?: string) => boolean;
  getValidTargets: (currentState: S, role?: string) => S[];
  isTerminal: (state: S) => boolean;
}

// ─── Factory ─────────────────────────────────────────────────

export function createStateMachine<S extends string>(
  definition: WorkflowDefinition<S>,
): StateMachine<S> {
  const { name, states, transitions } = definition;

  // Pre-index transitions by "from" state
  const transitionMap = new Map<S, TransitionDef<S>[]>();
  for (const t of transitions) {
    const list = transitionMap.get(t.from) ?? [];
    list.push(t);
    transitionMap.set(t.from, list);
  }

  function findTransition(from: S, to: S): TransitionDef<S> | undefined {
    return transitionMap.get(from)?.find((t) => t.to === to);
  }

  function canTransition(currentState: S, targetState: S, role?: string): boolean {
    if (currentState === targetState) return true; // no-op allowed
    const t = findTransition(currentState, targetState);
    if (!t) return false;
    if (role && t.allowedRoles?.length && !t.allowedRoles.includes(role)) return false;
    return true;
  }

  function getValidTargets(currentState: S, role?: string): S[] {
    const defs = transitionMap.get(currentState) ?? [];
    return defs
      .filter((t) => !role || !t.allowedRoles?.length || t.allowedRoles.includes(role))
      .map((t) => t.to);
  }

  function isTerminal(state: S): boolean {
    return states[state]?.terminal ?? false;
  }

  async function transition(currentState: S, targetState: S, ctx: TransitionContext): Promise<S> {
    // No-op
    if (currentState === targetState) return currentState;

    // Validate state exists
    if (!states[currentState]) {
      throw new ConflictError(`[${name}] Unknown state: ${currentState}`);
    }
    if (!states[targetState]) {
      throw new ConflictError(`[${name}] Unknown target state: ${targetState}`);
    }

    // Check terminal
    if (isTerminal(currentState)) {
      throw new ConflictError(`[${name}] Cannot transition from terminal state ${currentState}`);
    }

    // Find transition definition
    const t = findTransition(currentState, targetState);
    if (!t) {
      throw new ConflictError(`[${name}] Invalid transition: ${currentState} → ${targetState}`);
    }

    // Check role permission
    if (t.allowedRoles?.length && !t.allowedRoles.includes(ctx.role)) {
      throw new ConflictError(
        `[${name}] Role ${ctx.role} cannot perform transition ${currentState} → ${targetState}`,
      );
    }

    // Run guard
    if (t.guard) {
      const allowed = await t.guard(ctx);
      if (!allowed) {
        throw new ConflictError(
          `[${name}] Transition ${currentState} → ${targetState} blocked by guard`,
        );
      }
    }

    // Run onExit hook
    if (states[currentState]?.onExit) {
      await states[currentState].onExit!(ctx);
    }

    // Run onEnter hook
    if (states[targetState]?.onEnter) {
      await states[targetState].onEnter!(ctx);
    }

    return targetState;
  }

  return { name, transition, canTransition, getValidTargets, isTerminal };
}

// ─── LIMS Workflow Definitions ───────────────────────────────

export type VisitState =
  | 'REGISTERED'
  | 'SAMPLES_COLLECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export const VISIT_WORKFLOW: WorkflowDefinition<VisitState> = {
  name: 'Visit',
  states: {
    REGISTERED: {},
    SAMPLES_COLLECTED: {},
    IN_PROGRESS: {},
    COMPLETED: { terminal: true },
    CANCELLED: { terminal: true },
  },
  transitions: [
    { from: 'REGISTERED', to: 'SAMPLES_COLLECTED' },
    { from: 'REGISTERED', to: 'CANCELLED' },
    { from: 'SAMPLES_COLLECTED', to: 'IN_PROGRESS' },
    { from: 'SAMPLES_COLLECTED', to: 'CANCELLED' },
    { from: 'IN_PROGRESS', to: 'COMPLETED' },
    { from: 'IN_PROGRESS', to: 'CANCELLED' },
  ],
};

export type SampleState = 'PENDING_COLLECTION' | 'COLLECTED' | 'IN_LAB' | 'PROCESSED' | 'REJECTED';

export const SAMPLE_WORKFLOW: WorkflowDefinition<SampleState> = {
  name: 'Sample',
  states: {
    PENDING_COLLECTION: {},
    COLLECTED: {},
    IN_LAB: {},
    PROCESSED: { terminal: true },
    REJECTED: { terminal: true },
  },
  transitions: [
    { from: 'PENDING_COLLECTION', to: 'COLLECTED' },
    { from: 'PENDING_COLLECTION', to: 'REJECTED' },
    { from: 'COLLECTED', to: 'IN_LAB' },
    { from: 'COLLECTED', to: 'REJECTED' },
    { from: 'IN_LAB', to: 'PROCESSED' },
    { from: 'IN_LAB', to: 'REJECTED' },
  ],
};

export type ResultState = 'PENDING' | 'ENTERED' | 'VERIFIED' | 'REJECTED';

export const RESULT_WORKFLOW: WorkflowDefinition<ResultState> = {
  name: 'Result',
  states: {
    PENDING: {},
    ENTERED: {},
    VERIFIED: { terminal: true },
    REJECTED: {},
  },
  transitions: [
    { from: 'PENDING', to: 'ENTERED' },
    { from: 'ENTERED', to: 'VERIFIED' },
    { from: 'ENTERED', to: 'REJECTED' },
    { from: 'REJECTED', to: 'ENTERED' }, // re-entry after rejection
  ],
};

export type ReportState = 'PENDING' | 'GENERATED' | 'APPROVED' | 'DISPATCHED';

export const REPORT_WORKFLOW: WorkflowDefinition<ReportState> = {
  name: 'Report',
  states: {
    PENDING: {},
    GENERATED: {},
    APPROVED: {},
    DISPATCHED: { terminal: true },
  },
  transitions: [
    { from: 'PENDING', to: 'GENERATED' },
    { from: 'GENERATED', to: 'APPROVED' },
    { from: 'APPROVED', to: 'DISPATCHED' },
  ],
};

export type InvoiceState = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export const INVOICE_WORKFLOW: WorkflowDefinition<InvoiceState> = {
  name: 'Invoice',
  states: {
    PENDING: {},
    PARTIAL: {},
    PAID: { terminal: true },
    CANCELLED: { terminal: true },
    REFUNDED: { terminal: true },
  },
  transitions: [
    { from: 'PENDING', to: 'PARTIAL' },
    { from: 'PENDING', to: 'PAID' },
    { from: 'PENDING', to: 'CANCELLED' },
    { from: 'PARTIAL', to: 'PAID' },
    { from: 'PARTIAL', to: 'CANCELLED' },
    { from: 'PAID', to: 'REFUNDED' },
    { from: 'PARTIAL', to: 'REFUNDED' },
  ],
};

// ─── Pre-built machine instances ─────────────────────────

export const visitMachine = createStateMachine(VISIT_WORKFLOW);
export const sampleMachine = createStateMachine(SAMPLE_WORKFLOW);
export const resultMachine = createStateMachine(RESULT_WORKFLOW);
export const reportMachine = createStateMachine(REPORT_WORKFLOW);
export const invoiceMachine = createStateMachine(INVOICE_WORKFLOW);
