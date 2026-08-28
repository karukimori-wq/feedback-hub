import { Hono } from 'hono';
import { z } from 'zod';
import { APP_NAME, CONTRACT_VERSION } from './domain';
import {
  analyzeConversation,
  createConversation,
  createFeedbackIntake,
  createMessage,
  getAdminFollowUpQueue,
  getAdminInbox,
  getAdminIntakeMetrics,
  getAdminOverview,
  getAdminRankings,
  getAdminTriageQueue,
  getConversation,
  getConversationFollowUps,
  getIssueSummary,
  getIssue,
  getIssueSourceMessages,
  getPersistenceStatus,
  getRankedIssues,
  getRequestRankings,
  getUrgentNotificationSummary,
  listConversations,
  listIssues,
  runPersistenceRoundtrip,
  updateConversationStatus,
  updateIssueStatus,
  urgentNotifications,
} from './repository';
import { adminFollowUpQueueQuerySchema, adminInboxQuerySchema, adminIntakeMetricsQuerySchema, adminRankingsQuerySchema, adminTriageQueueQuerySchema, conversationFollowUpsQuerySchema, createConversationSchema, createFeedbackIntakeSchema, createMessageSchema, issueSourceMessagesQuerySchema, listConversationsQuerySchema, listIssuesQuerySchema, rankingQuerySchema, updateConversationStatusSchema, updateIssueStatusSchema } from './schemas';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Client-Id, X-Workspace-Id, X-User-Id, X-Request-Id, X-Correlation-Id');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.onError((error, c) => {
  if (error instanceof z.ZodError) {
    return c.json({
      status: 'error',
      errorCode: 'VALIDATION_ERROR',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }, 400);
  }
  if (error.message === 'CONVERSATION_NOT_FOUND') {
    return c.json({ status: 'error', errorCode: 'CONVERSATION_NOT_FOUND' }, 404);
  }
  return c.json({ status: 'error', errorCode: 'INTERNAL_ERROR' }, 500);
});

app.get('/health', (c) => c.json({ appName: APP_NAME, status: 'success', timestamp: new Date().toISOString() }));

app.get('/version', (c) => c.json({ appName: APP_NAME, version: '0.1.0', contractVersion: CONTRACT_VERSION }));

app.get('/contracts/status', (c) => c.json({
  appName: APP_NAME,
  status: 'success',
  identityMode: 'workspaceId+userId',
  professionalIdRequired: false,
  contractVersion: CONTRACT_VERSION,
  aiProvider: 'ai-platform-core',
  localAiUsage: 'fallback-only',
  owns: ['Feedback Conversation', 'Feedback Message', 'Feedback AI Analysis', 'Feedback Issue', 'Feedback Ranking'],
  doesNotOwn: ['Customer master', 'Lead lifecycle', 'Reservation', 'Payment', 'Sales / revenue', 'Engineering task management'],
  endpoints: [
    'GET /health',
    'GET /version',
    'GET /contracts/status',
    'GET /api/persistence/status',
    'POST /api/persistence/roundtrip',
    'POST /api/feedback/intake',
    'GET /api/feedback/conversations',
    'POST /api/feedback/conversations',
    'GET /api/feedback/conversations/:conversationId',
    'GET /api/feedback/conversations/:conversationId/follow-ups',
    'POST /api/feedback/conversations/:conversationId/messages',
    'POST /api/feedback/conversations/:conversationId/analyze',
    'POST /api/feedback/conversations/:conversationId/status',
    'GET /api/feedback/issues',
    'GET /api/feedback/issues/:issueId',
    'GET /api/feedback/issues/:issueId/source-messages',
    'POST /api/feedback/issues/:issueId/status',
    'GET /api/feedback/rankings/bugs',
    'GET /api/feedback/rankings/requests',
    'GET /api/feedback/rankings/questions',
    'GET /api/feedback/notifications/urgent',
    'GET /api/feedback/notifications/urgent/summary',
    'GET /api/admin/follow-up-queue',
    'GET /api/admin/inbox',
    'GET /api/admin/intake-metrics',
    'GET /api/admin/rankings',
    'GET /api/admin/issue-summary',
    'GET /api/admin/triage-queue',
    'GET /api/admin/overview',
  ],
  timestamp: new Date().toISOString(),
}));

app.get('/api/persistence/status', async (c) => c.json({
  appName: APP_NAME,
  status: 'success',
  ...await getPersistenceStatus(c.env.DB),
}));

app.post('/api/persistence/roundtrip', async (c) => c.json({
  appName: APP_NAME,
  status: 'success',
  ...await runPersistenceRoundtrip(c.env.DB, c.env),
}, 201));

app.post('/api/feedback/intake', async (c) => {
  const input = createFeedbackIntakeSchema.parse(await c.req.json());
  const result = await createFeedbackIntake(c.env.DB, c.env, input);
  return c.json({ status: 'success', ...result }, 201);
});

app.post('/api/feedback/conversations', async (c) => {
  const input = createConversationSchema.parse(await c.req.json());
  const result = await createConversation(c.env.DB, input);
  return c.json({ status: 'success', ...result }, 201);
});

app.get('/api/feedback/conversations', async (c) => {
  const query = listConversationsQuerySchema.parse({
    workspaceId: c.req.query('workspaceId'),
    appId: c.req.query('appId'),
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', conversations: await listConversations(c.env.DB, query) });
});

app.get('/api/feedback/conversations/:conversationId', async (c) => {
  const result = await getConversation(c.env.DB, c.req.param('conversationId'));
  if (!result) return c.json({ status: 'error', errorCode: 'CONVERSATION_NOT_FOUND' }, 404);
  return c.json({ status: 'success', ...result });
});

app.get('/api/feedback/conversations/:conversationId/follow-ups', async (c) => {
  const query = conversationFollowUpsQuerySchema.parse({
    limit: c.req.query('limit'),
  });
  const result = await getConversationFollowUps(c.env.DB, c.req.param('conversationId'), query);
  if (!result) return c.json({ status: 'error', errorCode: 'CONVERSATION_NOT_FOUND' }, 404);
  return c.json({ status: 'success', followUps: result });
});

app.post('/api/feedback/conversations/:conversationId/messages', async (c) => {
  const input = createMessageSchema.parse(await c.req.json());
  const result = await createMessage(c.env.DB, c.req.param('conversationId'), input);
  return c.json({ status: 'success', ...result }, 201);
});

app.post('/api/feedback/conversations/:conversationId/analyze', async (c) => {
  const result = await analyzeConversation(c.env.DB, c.req.param('conversationId'), c.env);
  return c.json({ status: 'success', ...result }, 201);
});

app.post('/api/feedback/conversations/:conversationId/status', async (c) => {
  const input = updateConversationStatusSchema.parse(await c.req.json());
  const result = await updateConversationStatus(c.env.DB, c.req.param('conversationId'), input);
  if (!result) return c.json({ status: 'error', errorCode: 'CONVERSATION_NOT_FOUND' }, 404);
  return c.json({ status: 'success', statusEvent: result });
});

app.get('/api/feedback/issues', async (c) => {
  const query = listIssuesQuerySchema.parse({
    category: c.req.query('category'),
    status: c.req.query('status'),
    severity: c.req.query('severity'),
    impact: c.req.query('impact'),
    minCount: c.req.query('minCount'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', issues: await listIssues(c.env.DB, query) });
});

app.get('/api/feedback/issues/:issueId', async (c) => {
  const result = await getIssue(c.env.DB, c.req.param('issueId'));
  if (!result) return c.json({ status: 'error', errorCode: 'ISSUE_NOT_FOUND' }, 404);
  return c.json({ status: 'success', ...result });
});

app.get('/api/feedback/issues/:issueId/source-messages', async (c) => {
  const query = issueSourceMessagesQuerySchema.parse({
    limit: c.req.query('limit'),
  });
  const result = await getIssueSourceMessages(c.env.DB, c.req.param('issueId'), query);
  if (!result) return c.json({ status: 'error', errorCode: 'ISSUE_NOT_FOUND' }, 404);
  return c.json({ status: 'success', ...result });
});

app.post('/api/feedback/issues/:issueId/status', async (c) => {
  const input = updateIssueStatusSchema.parse(await c.req.json());
  const result = await updateIssueStatus(c.env.DB, c.req.param('issueId'), input);
  if (!result) return c.json({ status: 'error', errorCode: 'ISSUE_NOT_FOUND' }, 404);
  return c.json({ status: 'success', statusEvent: result });
});

app.get('/api/feedback/rankings/bugs', async (c) => {
  const query = rankingQuerySchema.parse({
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', ranking: await getRankedIssues(c.env.DB, 'Bug', { ...query, limit: query.limit ?? 10 }) });
});
app.get('/api/feedback/rankings/requests', async (c) => {
  const query = rankingQuerySchema.parse({
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', ranking: await getRequestRankings(c.env.DB, query) });
});
app.get('/api/feedback/rankings/questions', async (c) => {
  const query = rankingQuerySchema.parse({
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', ranking: await getRankedIssues(c.env.DB, 'Question', query) });
});
app.get('/api/feedback/notifications/urgent', async (c) => c.json({ status: 'success', notifications: await urgentNotifications(c.env.DB) }));
app.get('/api/feedback/notifications/urgent/summary', async (c) => c.json({ status: 'success', summary: await getUrgentNotificationSummary(c.env.DB) }));

app.get('/api/admin/overview', async (c) => c.json({
  status: 'success',
  overview: await getAdminOverview(c.env.DB),
}));

app.get('/api/admin/follow-up-queue', async (c) => {
  const query = adminFollowUpQueueQuerySchema.parse({
    workspaceId: c.req.query('workspaceId'),
    appId: c.req.query('appId'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', followUpQueue: await getAdminFollowUpQueue(c.env.DB, query) });
});

app.get('/api/admin/inbox', async (c) => {
  const query = adminInboxQuerySchema.parse({
    workspaceId: c.req.query('workspaceId'),
    appId: c.req.query('appId'),
    status: c.req.query('status'),
    category: c.req.query('category'),
    severity: c.req.query('severity'),
    impact: c.req.query('impact'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', inbox: await getAdminInbox(c.env.DB, query) });
});

app.get('/api/admin/intake-metrics', async (c) => {
  const query = adminIntakeMetricsQuerySchema.parse({
    workspaceId: c.req.query('workspaceId'),
    appId: c.req.query('appId'),
    since: c.req.query('since'),
  });
  return c.json({ status: 'success', metrics: await getAdminIntakeMetrics(c.env.DB, query) });
});

app.get('/api/admin/rankings', async (c) => {
  const query = adminRankingsQuerySchema.parse({
    status: c.req.query('status'),
    bugLimit: c.req.query('bugLimit'),
    requestLimit: c.req.query('requestLimit'),
    questionLimit: c.req.query('questionLimit'),
  });
  return c.json({ status: 'success', rankings: await getAdminRankings(c.env.DB, query) });
});

app.get('/api/admin/issue-summary', async (c) => c.json({
  status: 'success',
  summary: await getIssueSummary(c.env.DB),
}));

app.get('/api/admin/triage-queue', async (c) => {
  const query = adminTriageQueueQuerySchema.parse({
    category: c.req.query('category'),
    status: c.req.query('status'),
    severity: c.req.query('severity'),
    impact: c.req.query('impact'),
    minCount: c.req.query('minCount'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', triageQueue: await getAdminTriageQueue(c.env.DB, query) });
});

app.notFound((c) => c.json({ status: 'error', errorCode: 'NOT_FOUND' }, 404));

export default app;

export function validateUnknown(value: unknown, schema: z.ZodSchema) {
  return schema.parse(value);
}
