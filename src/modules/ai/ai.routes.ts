import { Router } from 'express';
import * as aiController from './ai.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { chatMessageSchema } from './ai.validators.js';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/ai/chat
 * Send a message to the AI assistant
 */
router.post(
  '/chat',
  validate(chatMessageSchema),
  (req, res, next) => void aiController.chat(req, res, next),
);

/**
 * POST /api/v1/ai/reset
 * Reset a conversation
 */
router.post(
  '/reset',
  (req, res, next) => void aiController.resetChat(req, res, next),
);

export default router;
