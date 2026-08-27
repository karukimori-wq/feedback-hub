import { z } from 'zod';

export const createConversationSchema = z.object({
  appId: z.string().min(1),
  appName: z.string().min(1),
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  route: z.string().optional(),
  screenName: z.string().optional(),
  appVersion: z.string().optional(),
  device: z.string().optional(),
  browser: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  initialMessage: z.string().min(1).optional(),
});

export const createMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  body: z.string().min(1),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
