// ==================== AI Assistant Types — Enterprise Edition ====================

/**
 * Supported task intents the AI can execute.
 * Each maps to a strict, step-based workflow with validation.
 */
export type AiIntent =
  | 'CREATE_PATIENT'
  | 'CREATE_VISIT'
  | 'ADD_TESTS'
  | 'GENERATE_INVOICE'
  | 'CHECK_REPORT_STATUS'
  | 'SEARCH_PATIENT'
  | 'SEARCH_VISIT'
  | 'NAVIGATE'
  | 'UNKNOWN';

/**
 * Tracks the full state of a task workflow within a conversation.
 */
export interface AiConversationState {
  intent: AiIntent | null;
  currentStep: number;
  totalSteps: number;
  payload: Record<string, unknown>;
  awaitingConfirmation: boolean;
  completed: boolean;
  stepLabels: string[];
}

/**
 * A single task step definition.
 * `validate` returns null on success or the error message string.
 */
export interface TaskStepDefinition {
  field: string;
  label: string;
  question: string;
  hint?: string;
  validate: (value: string) => string | null;
}

/**
 * The shape of every response returned to the frontend.
 */
export interface AiChatResponse {
  message: string;
  conversationId: string;
  state: AiConversationState;
  suggestions?: string[];
  messageType: 'system' | 'step' | 'validation_error' | 'confirmation' | 'result' | 'info' | 'error' | 'navigation';
}
