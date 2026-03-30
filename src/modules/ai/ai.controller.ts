import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as aiService from './ai.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types/auth.types.js';
import type { ChatMessageInput } from './ai.validators.js';

/**
 * POST /api/v1/ai/chat
 * Send a message to the AI assistant
 *
 * Access: All authenticated staff
 */
export const chat = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { message, conversationId } = req.body as ChatMessageInput;

    const response = await aiService.handleChat(
      message,
      req.user.userId,
      req.user.role,
      conversationId,
    );

    sendSuccess(res, response, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/reset
 * Reset/clear an AI conversation
 *
 * Access: All authenticated staff
 */
export const resetChat = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const { conversationId } = req.body as { conversationId?: string };

    if (conversationId) {
      aiService.resetConversation(conversationId);
    }

    sendSuccess(res, { message: 'Conversation reset successfully' }, StatusCodes.OK);
  } catch (error) {
    next(error);
  }
};
