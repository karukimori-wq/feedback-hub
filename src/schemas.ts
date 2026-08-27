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

export const updateIssueStatusSchema = z.object({
  status: z.enum(['open', 'triaged', 'accepted', 'resolved', 'closed']),
  changedBy: z.string().min(1).optional(),
  note: z.string().min(1).max(2000).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
