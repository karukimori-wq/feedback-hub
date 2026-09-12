import { Hono } from 'hono';
import { z } from 'zod';
import { ACCEPTED_PLAN_IDS, APP_NAME, CONTRACT_VERSION, EXTERNAL_INTELLIGENCE_SNAPSHOT_SECTIONS, PLAN_CONTRACT_REFERENCES, RELEASE_CLASSIFICATION_TARGETS, RELEASE_CONTEXT_FIELDS, RELEASE_READY_SOURCE_APPS, RELEASE_SMOKE_CHECKS, SUPPORTED_SOURCE_APPS } from './domain';
import {
  analyzeConversation,
  createConversation,
  createEmbedConversationMessage,
  createFeedbackIntake,
  getEmbedConversation,
  getEmbedConfig,
  getEmbedFeedbackStatus,
  createMessage,
  getAdminActionBoard,
  getAdminAppSummary,
  getAdminFollowUpQueue,
  getAdminInbox,
  getAdminIntakeMetrics,
  getAdminIssueEvidence,
  getAdminIssueBriefs,
  getAdminMetadataQuality,
  getAdminOverview,
  getAdminRankings,
  getAdminReleaseIntakeSummary,
  getAdminReleaseReadiness,
  getAdminStatusActivity,
  getAdminTriageQueue,
  getConversation,
  getConversationFollowUps,
  getIssueSummary,
  getIssue,
  getIssueSourceMessages,
  getPersistenceStatus,
  getRankedIssues,
  getRequestRankings,
  getSourceAppContracts,
  getUrgentNotificationSummary,
  listConversations,
  listIssues,
  runPersistenceRoundtrip,
  updateConversationStatus,
  updateIssueStatus,
  urgentNotifications,
} from './repository';
import { adminActionBoardQuerySchema, adminAppSummaryQuerySchema, adminFollowUpQueueQuerySchema, adminInboxQuerySchema, adminIntakeMetricsQuerySchema, adminIssueBriefsQuerySchema, adminMetadataQualityQuerySchema, adminRankingsQuerySchema, adminReleaseIntakeSummaryQuerySchema, adminStatusActivityQuerySchema, adminTriageQueueQuerySchema, conversationFollowUpsQuerySchema, createConversationSchema, createEmbedConversationMessageSchema, createFeedbackIntakeSchema, createMessageSchema, embedConfigQuerySchema, embedFeedbackStatusQuerySchema, issueEvidenceQuerySchema, issueSourceMessagesQuerySchema, listConversationsQuerySchema, listIssuesQuerySchema, rankingQuerySchema, updateConversationStatusSchema, updateIssueStatusSchema } from './schemas';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Client-Id, X-Workspace-Id, X-User-Id, X-Request-Id, X-Correlation-Id, X-Source-App, X-Plan-Id');
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
  supportedSourceApps: [...SUPPORTED_SOURCE_APPS],
  releaseReadySourceApps: [...RELEASE_READY_SOURCE_APPS],
  acceptedPlanIds: [...ACCEPTED_PLAN_IDS],
  bugReportsRateLimitedByPlan: false,
  sensitiveBodyRedaction: true,
  releaseSmoke: {
    command: 'FEEDBACK_HUB_WORKER_URL="$WORKER_URL" npm run smoke:release-intake',
    checks: [...RELEASE_SMOKE_CHECKS],
  },
  owns: ['Feedback Conversation', 'Feedback Message', 'Feedback AI Analysis', 'Feedback Issue', 'Feedback Ranking'],
  doesNotOwn: ['Customer master', 'Lead lifecycle', 'Reservation', 'Payment', 'Sales / revenue', 'Engineering task management'],
  endpoints: [
    'GET /health',
    'GET /version',
    'GET /contracts/status',
    'GET /api/persistence/status',
    'POST /api/persistence/roundtrip',
    'GET /api/embed/config',
    'POST /api/embed/feedback',
    'GET /api/embed/feedback/status',
    'GET /api/embed/conversations/:conversationId',
    'POST /api/embed/conversations/:conversationId/messages',
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
    'GET /api/admin/action-board',
    'GET /api/admin/app-summary',
    'GET /api/admin/follow-up-queue',
    'GET /api/admin/inbox',
    'GET /api/admin/intake-metrics',
    'GET /api/admin/issues/:issueId/evidence',
    'GET /api/admin/issue-briefs',
    'GET /api/admin/metadata-quality',
    'GET /api/admin/rankings',
    'GET /api/admin/release-intake-summary',
    'GET /api/admin/release-readiness',
    'GET /api/admin/release-smoke-plan',
    'GET /api/admin/external-intelligence-snapshot',
    'GET /api/admin/source-app-contracts',
    'GET /api/admin/status-activity',
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
  const statusCode = 'deduplicated' in result && result.deduplicated ? 200 : 201;
  return c.json({ status: 'success', ...result }, statusCode);
});

app.get('/api/embed/config', (c) => {
  const query = embedConfigQuerySchema.parse({
    appId: c.req.query('appId'),
  });
  return c.json({ status: 'success', config: getEmbedConfig(query) });
});

app.post('/api/embed/feedback', async (c) => {
  const input = createFeedbackIntakeSchema.parse(await c.req.json());
  const result = await createFeedbackIntake(c.env.DB, c.env, input);
  const statusCode = 'deduplicated' in result && result.deduplicated ? 200 : 201;
  return c.json({ status: 'success', ...result }, statusCode);
});

app.get('/api/embed/feedback/status', async (c) => {
  const query = embedFeedbackStatusQuerySchema.parse({
    correlationId: c.req.query('correlationId'),
    sourceApp: c.req.query('sourceApp'),
    workspaceId: c.req.query('workspaceId'),
    userId: c.req.query('userId'),
  });
  const result = await getEmbedFeedbackStatus(c.env.DB, query);
  if (!result) return c.json({ status: 'error', errorCode: 'FEEDBACK_STATUS_NOT_FOUND' }, 404);
  return c.json({ status: 'success', feedbackStatus: result });
});

app.get('/api/embed/conversations/:conversationId', async (c) => {
  const result = await getEmbedConversation(c.env.DB, c.req.param('conversationId'));
  if (!result) return c.json({ status: 'error', errorCode: 'CONVERSATION_NOT_FOUND' }, 404);
  return c.json({ status: 'success', ...result });
});

app.post('/api/embed/conversations/:conversationId/messages', async (c) => {
  const input = createEmbedConversationMessageSchema.parse(await c.req.json());
  const result = await createEmbedConversationMessage(c.env.DB, c.env, c.req.param('conversationId'), input);
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
    sourceApp: c.req.query('sourceApp'),
    planId: c.req.query('planId'),
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

app.get('/api/admin/action-board', async (c) => {
  const query = adminActionBoardQuerySchema.parse({
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', actionBoard: await getAdminActionBoard(c.env.DB, query) });
});

app.get('/api/admin/app-summary', async (c) => {
  const query = adminAppSummaryQuerySchema.parse({
    since: c.req.query('since'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', appSummary: await getAdminAppSummary(c.env.DB, query) });
});

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
    sourceApp: c.req.query('sourceApp'),
    planId: c.req.query('planId'),
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
    sourceApp: c.req.query('sourceApp'),
    planId: c.req.query('planId'),
    since: c.req.query('since'),
  });
  return c.json({ status: 'success', metrics: await getAdminIntakeMetrics(c.env.DB, query) });
});

app.get('/api/admin/issues/:issueId/evidence', async (c) => {
  const query = issueEvidenceQuerySchema.parse({
    limit: c.req.query('limit'),
  });
  const result = await getAdminIssueEvidence(c.env.DB, c.req.param('issueId'), query);
  if (!result) return c.json({ status: 'error', errorCode: 'ISSUE_NOT_FOUND' }, 404);
  return c.json({ status: 'success', evidence: result });
});

app.get('/api/admin/issue-briefs', async (c) => {
  const query = adminIssueBriefsQuerySchema.parse({
    category: c.req.query('category'),
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', issueBriefs: await getAdminIssueBriefs(c.env.DB, query) });
});

app.get('/api/admin/metadata-quality', async (c) => {
  const query = adminMetadataQualityQuerySchema.parse({
    workspaceId: c.req.query('workspaceId'),
    appId: c.req.query('appId'),
    since: c.req.query('since'),
  });
  return c.json({ status: 'success', metadataQuality: await getAdminMetadataQuality(c.env.DB, query) });
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

app.get('/api/admin/release-intake-summary', async (c) => {
  const query = adminReleaseIntakeSummaryQuerySchema.parse({
    since: c.req.query('since'),
  });
  return c.json({ status: 'success', releaseIntakeSummary: await getAdminReleaseIntakeSummary(c.env.DB, query) });
});

app.get('/api/admin/release-readiness', async (c) => c.json({
  status: 'success',
  readiness: await getAdminReleaseReadiness(c.env.DB, c.env),
}));

app.get('/api/admin/release-smoke-plan', (c) => c.json({
  status: 'success',
  smokePlan: {
    sourceApps: [...RELEASE_READY_SOURCE_APPS],
    planIds: ['free', 'pro'],
    command: 'FEEDBACK_HUB_WORKER_URL="$WORKER_URL" npm run smoke:release-intake',
    checks: [...RELEASE_SMOKE_CHECKS],
    samplePayloads: {
      numeriaStudioFree: {
        appId: 'numeria-studio',
        sourceApp: 'numeria-studio',
        planId: 'free',
        category: 'Question',
        requiredContextFields: ['sourceApp', 'appVersion', 'planId', 'workspaceId', 'userId', 'currentScreen', 'category', 'occurredAt', 'correlationId'],
      },
      velvetPro: {
        appId: 'velvet',
        sourceApp: 'velvet',
        planId: 'pro',
        category: 'Bug',
        requiredContextFields: ['sourceApp', 'appVersion', 'planId', 'workspaceId', 'userId', 'currentScreen', 'category', 'occurredAt', 'correlationId'],
      },
    },
    bodyRules: {
      includePaymentDetails: false,
      includeSecretValues: false,
      rawVoicePreservedAfterRedaction: true,
    },
  },
}));

app.get('/api/admin/external-intelligence-snapshot', (c) => c.json({
  status: 'success',
  snapshot: {
    appName: APP_NAME,
    contractVersion: CONTRACT_VERSION,
    snapshotVersion: 'feedback-hub.external-intelligence.v1',
    sections: [...EXTERNAL_INTELLIGENCE_SNAPSHOT_SECTIONS],
    identity: {
      role: 'user-voice-intelligence',
      identityMode: 'workspaceId+userId',
      professionalIdRequired: false,
    },
    responsibilityBoundary: {
      owns: ['Feedback Conversation', 'Feedback Message', 'Feedback AI Analysis', 'Feedback Issue', 'Feedback Ranking', 'Admin feedback signals'],
      doesNotOwn: ['Question box visual UI', 'Customer master', 'Reservation', 'Payment', 'Sales / revenue', 'Engineering task management', 'Plan billing management'],
      sourceAppUiOwner: 'source-app',
      processingOwner: 'feedback-hub',
    },
    releaseScope: {
      sourceApps: [...RELEASE_READY_SOURCE_APPS],
      acceptedSourceApps: [...SUPPORTED_SOURCE_APPS],
      planIds: ['free', 'pro'],
      futurePlanIds: ['business'],
      requiredContextFields: [...RELEASE_CONTEXT_FIELDS],
      planContractReferences: [...PLAN_CONTRACT_REFERENCES],
      bugReportsRateLimitedByPlan: false,
    },
    intakeContract: {
      appOwnedEntryLabel: '質問・改善',
      intakeEndpoint: '/api/embed/feedback',
      compatibleIntakeEndpoint: '/api/feedback/intake',
      followUpEndpointTemplate: '/api/embed/conversations/{conversationId}/messages',
      conversationEndpointTemplate: '/api/embed/conversations/{conversationId}',
      requiredMessageField: 'initialMessage',
      sensitiveBodyRules: {
        redactBeforePersistence: true,
        storePaymentDetails: false,
        storeSecretValues: false,
      },
    },
    aiProcessing: {
      provider: 'ai-platform-core',
      localAiUsage: 'fallback-only',
      knowledgeScopeBySourceApp: true,
      fallbackPurpose: 'local-development-tests-and-apc-outages',
    },
    analysisOutputs: {
      conversationModel: ['Conversation', 'Message', 'AI Analysis', 'Issue'],
      categories: ['Question', 'Bug', 'Improvement', 'Feature Request', 'UX Feedback', 'Other'],
      releaseClassificationTargets: [...RELEASE_CLASSIFICATION_TARGETS],
      grouping: 'similar-feedback-to-canonical-issue',
      priorityFormula: 'severity * count * impact',
      rawVoicePreservedAfterRedaction: true,
    },
    adminSignals: {
      rankings: ['Bug TOP10', 'Request TOP20', 'Question TOP20'],
      urgentNotificationRules: ['Critical severity', 'Critical impact', 'same issue count >= 30', 'billing issue', 'data loss suspected', 'login blocked', 'plan reflection failure', 'production save failure'],
      aggregations: ['sourceApp', 'planId', 'category', 'severity', 'impact'],
    },
    handoffTargets: {
      externalIntelligenceSystem: {
        recommendedIngestEndpoint: '/api/admin/external-intelligence-snapshot',
        recommendedRefresh: 'before-development-and-after-main-push',
      },
      professionalPlatformContracts: {
        contractEndpoint: '/contracts/status',
        handoffEndpoint: '/api/admin/external-intelligence-snapshot',
        sourceAppContractsEndpoint: '/api/admin/source-app-contracts',
      },
      platformAdmin: {
        readinessEndpoint: '/api/admin/release-readiness',
        smokePlanEndpoint: '/api/admin/release-smoke-plan',
        sourceAppContractsEndpoint: '/api/admin/source-app-contracts',
        releaseIntakeSummaryEndpoint: '/api/admin/release-intake-summary',
      },
    },
    generatedAt: new Date().toISOString(),
  },
}));

app.get('/api/admin/source-app-contracts', (c) => c.json({
  status: 'success',
  sourceAppContracts: getSourceAppContracts(),
}));

app.get('/api/admin/status-activity', async (c) => {
  const query = adminStatusActivityQuerySchema.parse({
    issueId: c.req.query('issueId'),
    nextStatus: c.req.query('nextStatus'),
    since: c.req.query('since'),
    limit: c.req.query('limit'),
  });
  return c.json({ status: 'success', statusActivity: await getAdminStatusActivity(c.env.DB, query) });
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
