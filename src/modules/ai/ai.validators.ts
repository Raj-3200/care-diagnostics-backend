import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  conversationId: z.string().uuid().optional().nullable().transform((v) => v ?? undefined),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
