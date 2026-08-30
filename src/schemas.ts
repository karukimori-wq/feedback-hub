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

export const createFeedbackIntakeSchema = createConversationSchema.extend({
  initialMessage: z.string().min(1),
});

export const createMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  body: z.string().min(1),
});

export const updateConversationStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
});

export const listConversationsQuerySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  appId: z.string().min(1).optional(),
  status: z.enum(['open', 'closed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listIssuesQuerySchema = z.object({
  category: z.enum(['Question', 'Bug', 'Improvement', 'Feature Request', 'UX Feedback', 'Other']).optional(),
  status: z.enum(['open', 'triaged', 'accepted', 'resolved', 'closed']).optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  impact: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  minCount: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminInboxQuerySchema = listConversationsQuerySchema.extend({
  category: listIssuesQuerySchema.shape.category,
  severity: listIssuesQuerySchema.shape.severity,
  impact: listIssuesQuerySchema.shape.impact,
});

export const adminTriageQueueQuerySchema = z.object({
  category: listIssuesQuerySchema.shape.category,
  status: z.enum(['open', 'triaged']).optional(),
  severity: listIssuesQuerySchema.shape.severity,
  impact: listIssuesQuerySchema.shape.impact,
  minCount: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminIntakeMetricsQuerySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  appId: z.string().min(1).optional(),
  since: z.string().datetime().optional(),
});

export const adminMetadataQualityQuerySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  appId: z.string().min(1).optional(),
  since: z.string().datetime().optional(),
});

export const adminStatusActivityQuerySchema = z.object({
  issueId: z.string().min(1).optional(),
  nextStatus: z.enum(['open', 'triaged', 'accepted', 'resolved', 'closed']).optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminActionBoardQuerySchema = z.object({
  status: z.enum(['open', 'triaged', 'accepted']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminIssueBriefsQuerySchema = z.object({
  category: listIssuesQuerySchema.shape.category,
  status: listIssuesQuerySchema.shape.status,
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const rankingQuerySchema = z.object({
  status: z.enum(['open', 'triaged', 'accepted', 'resolved', 'closed']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const adminRankingsQuerySchema = z.object({
  status: rankingQuerySchema.shape.status,
  bugLimit: z.coerce.number().int().min(1).max(50).optional(),
  requestLimit: z.coerce.number().int().min(1).max(50).optional(),
  questionLimit: z.coerce.number().int().min(1).max(50).optional(),
});

export const issueSourceMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const conversationFollowUpsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const adminFollowUpQueueQuerySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  appId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(['open', 'triaged', 'accepted', 'resolved', 'closed']),
  changedBy: z.string().min(1).optional(),
  note: z.string().min(1).max(2000).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateFeedbackIntakeInput = z.infer<typeof createFeedbackIntakeSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ConversationFollowUpsQuery = z.infer<typeof conversationFollowUpsQuerySchema>;
export type AdminFollowUpQueueQuery = z.infer<typeof adminFollowUpQueueQuerySchema>;
export type AdminActionBoardQuery = z.infer<typeof adminActionBoardQuerySchema>;
export type AdminIssueBriefsQuery = z.infer<typeof adminIssueBriefsQuerySchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type AdminInboxQuery = z.infer<typeof adminInboxQuerySchema>;
export type AdminIntakeMetricsQuery = z.infer<typeof adminIntakeMetricsQuerySchema>;
export type AdminMetadataQualityQuery = z.infer<typeof adminMetadataQualityQuerySchema>;
export type AdminRankingsQuery = z.infer<typeof adminRankingsQuerySchema>;
export type AdminStatusActivityQuery = z.infer<typeof adminStatusActivityQuerySchema>;
export type AdminTriageQueueQuery = z.infer<typeof adminTriageQueueQuerySchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type IssueSourceMessagesQuery = z.infer<typeof issueSourceMessagesQuerySchema>;
export type RankingQuery = z.infer<typeof rankingQuerySchema>;
export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;
export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
