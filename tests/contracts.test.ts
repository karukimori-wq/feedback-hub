import { describe, expect, it } from 'vitest';
import app from '../src/index';

const env = {
  APP_NAME: 'feedback-hub',
  CONTRACT_VERSION: '0.1.0',
  DB: {} as D1Database,
};

describe('contract endpoints', () => {
  it('returns health status', async () => {
    const response = await app.request('/health', {}, env);
    expect(response.status).toBe(200);
    const body = await response.json() as { appName: string; status: string };
    expect(body.appName).toBe('feedback-hub');
    expect(body.status).toBe('success');
  });

  it('returns platform contract status', async () => {
    const response = await app.request('/contracts/status', {}, env);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      identityMode: string;
      professionalIdRequired: boolean;
      aiProvider: string;
      localAiUsage: string;
      supportedSourceApps: string[];
      releaseReadySourceApps: string[];
      acceptedPlanIds: string[];
      bugReportsRateLimitedByPlan: boolean;
      sensitiveBodyRedaction: boolean;
      endpoints: string[];
    };
    expect(body.identityMode).toBe('workspaceId+userId');
    expect(body.professionalIdRequired).toBe(false);
    expect(body.aiProvider).toBe('ai-platform-core');
    expect(body.localAiUsage).toBe('fallback-only');
    expect(body.supportedSourceApps).toContain('numeria-studio');
    expect(body.supportedSourceApps).toContain('velvet');
    expect(body.releaseReadySourceApps).toEqual(['numeria-studio', 'velvet']);
    expect(body.acceptedPlanIds).toEqual(['free', 'pro', 'business']);
    expect(body.bugReportsRateLimitedByPlan).toBe(false);
    expect(body.sensitiveBodyRedaction).toBe(true);
    expect(body.endpoints).toContain('GET /api/embed/config');
    expect(body.endpoints).toContain('POST /api/embed/feedback');
    expect(body.endpoints).toContain('GET /api/embed/conversations/:conversationId');
    expect(body.endpoints).toContain('POST /api/embed/conversations/:conversationId/messages');
    expect(body.endpoints).toContain('POST /api/feedback/intake');
    expect(body.endpoints).toContain('GET /api/feedback/conversations');
    expect(body.endpoints).toContain('POST /api/feedback/conversations');
    expect(body.endpoints).toContain('GET /api/feedback/conversations/:conversationId');
    expect(body.endpoints).toContain('GET /api/feedback/conversations/:conversationId/follow-ups');
    expect(body.endpoints).toContain('POST /api/feedback/conversations/:conversationId/status');
    expect(body.endpoints).toContain('GET /api/persistence/status');
    expect(body.endpoints).toContain('POST /api/persistence/roundtrip');
    expect(body.endpoints).toContain('GET /api/feedback/issues/:issueId/source-messages');
    expect(body.endpoints).toContain('POST /api/feedback/issues/:issueId/status');
    expect(body.endpoints).toContain('GET /api/feedback/notifications/urgent/summary');
    expect(body.endpoints).toContain('GET /api/admin/action-board');
    expect(body.endpoints).toContain('GET /api/admin/app-summary');
    expect(body.endpoints).toContain('GET /api/admin/follow-up-queue');
    expect(body.endpoints).toContain('GET /api/admin/inbox');
    expect(body.endpoints).toContain('GET /api/admin/intake-metrics');
    expect(body.endpoints).toContain('GET /api/admin/issue-briefs');
    expect(body.endpoints).toContain('GET /api/admin/metadata-quality');
    expect(body.endpoints).toContain('GET /api/admin/rankings');
    expect(body.endpoints).toContain('GET /api/admin/release-readiness');
    expect(body.endpoints).toContain('GET /api/admin/status-activity');
    expect(body.endpoints).toContain('GET /api/admin/issue-summary');
    expect(body.endpoints).toContain('GET /api/admin/triage-queue');
    expect(body.endpoints).toContain('GET /api/admin/overview');
  });

  it('returns release readiness when AI Platform Core and release columns are configured', async () => {
    const response = await app.request('/api/admin/release-readiness', {}, {
      ...env,
      AI_PLATFORM_CORE_BASE_URL: 'https://ai-platform-core.test',
      DB: d1WithConversationColumns([
        'conversation_id',
        'source_app',
        'plan_id',
        'current_screen',
        'submitted_category',
        'correlation_id',
      ]),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      readiness: {
        ready: boolean;
        releaseScope: { sourceApps: string[]; planIds: string[]; contextFields: string[] };
        aiPlatformCore: { configured: boolean; route: string };
        database: { ready: boolean; missingColumns: string[] };
        safeguards: { bugReportsRateLimitedByPlan: boolean; sensitiveBodyRedaction: boolean };
      };
    };
    expect(body.readiness.ready).toBe(true);
    expect(body.readiness.releaseScope.sourceApps).toEqual(['numeria-studio', 'velvet']);
    expect(body.readiness.releaseScope.planIds).toEqual(['free', 'pro']);
    expect(body.readiness.releaseScope.contextFields).toContain('correlationId');
    expect(body.readiness.aiPlatformCore.configured).toBe(true);
    expect(body.readiness.aiPlatformCore.route).toBe('http');
    expect(body.readiness.database.ready).toBe(true);
    expect(body.readiness.database.missingColumns).toEqual([]);
    expect(body.readiness.safeguards.bugReportsRateLimitedByPlan).toBe(false);
    expect(body.readiness.safeguards.sensitiveBodyRedaction).toBe(true);
  });

  it('marks release readiness as not ready when AI Platform Core or release columns are missing', async () => {
    const response = await app.request('/api/admin/release-readiness', {}, {
      ...env,
      DB: d1WithConversationColumns(['conversation_id']),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      readiness: {
        ready: boolean;
        aiPlatformCore: { configured: boolean; route: null };
        database: { ready: boolean; missingColumns: string[] };
        checks: Array<{ key: string; status: string }>;
      };
    };
    expect(body.readiness.ready).toBe(false);
    expect(body.readiness.aiPlatformCore.configured).toBe(false);
    expect(body.readiness.aiPlatformCore.route).toBeNull();
    expect(body.readiness.database.ready).toBe(false);
    expect(body.readiness.database.missingColumns).toContain('source_app');
    expect(body.readiness.checks).toContainEqual({ key: 'ai_platform_core_configured', status: 'fail', detail: 'AI Platform Core service binding or base URL is missing.' });
  });

  it('returns CORS preflight headers', async () => {
    const response = await app.request('/api/feedback/conversations', { method: 'OPTIONS' }, env);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns validation errors in a stable shape', async () => {
    const response = await app.request('/api/feedback/conversations', {
      method: 'POST',
      body: JSON.stringify({ appId: 'numeria-studio' }),
      headers: { 'Content-Type': 'application/json' },
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('requires an initial message for feedback intake', async () => {
    const response = await app.request('/api/feedback/intake', {
      method: 'POST',
      body: JSON.stringify({
        appId: 'numeria-studio',
        appName: 'Numeria Studio',
        workspaceId: 'ws_test',
        userId: 'user_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('returns source-app owned embed config for known apps', async () => {
    const response = await app.request('/api/embed/config?appId=numeria-studio', {}, env);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      status: string;
      config: {
        appId: string;
        appName: string;
        entryLabel: string;
        uiOwner: string;
        processingOwner: string;
        aiProvider: string;
        intakeEndpoint: string;
        followUpEndpointTemplate: string;
        conversationEndpointTemplate: string;
        requiredFields: string[];
        autoContextFields: string[];
        acceptedPlanIds: string[];
        bugReportsRateLimitedByPlan: boolean;
        rawVoicePreserved: boolean;
      };
    };
    expect(body.status).toBe('success');
    expect(body.config.appId).toBe('numeria-studio');
    expect(body.config.appName).toBe('Numeria Studio');
    expect(body.config.entryLabel).toBe('質問・改善');
    expect(body.config.uiOwner).toBe('source-app');
    expect(body.config.processingOwner).toBe('feedback-hub');
    expect(body.config.aiProvider).toBe('ai-platform-core');
    expect(body.config.intakeEndpoint).toBe('/api/embed/feedback');
    expect(body.config.followUpEndpointTemplate).toBe('/api/embed/conversations/{conversationId}/messages');
    expect(body.config.conversationEndpointTemplate).toBe('/api/embed/conversations/{conversationId}');
    expect(body.config.requiredFields).toContain('sourceApp');
    expect(body.config.requiredFields).toContain('appVersion');
    expect(body.config.requiredFields).toContain('planId');
    expect(body.config.requiredFields).toContain('currentScreen');
    expect(body.config.requiredFields).toContain('category');
    expect(body.config.requiredFields).toContain('occurredAt');
    expect(body.config.requiredFields).toContain('correlationId');
    expect(body.config.requiredFields).toContain('initialMessage');
    expect(body.config.autoContextFields).toContain('route');
    expect(body.config.autoContextFields).toContain('planId');
    expect(body.config.autoContextFields).toContain('correlationId');
    expect(body.config.acceptedPlanIds).toEqual(['free', 'pro', 'business']);
    expect(body.config.bugReportsRateLimitedByPlan).toBe(false);
    expect(body.config.rawVoicePreserved).toBe(true);
  });

  it('returns generic embed config for future apps', async () => {
    const response = await app.request('/api/embed/config?appId=future-app', {}, env);

    expect(response.status).toBe(200);
    const body = await response.json() as { config: { appId: string; appName: string; knowledgeScope: string } };
    expect(body.config.appId).toBe('future-app');
    expect(body.config.appName).toBe('future-app');
    expect(body.config.knowledgeScope).toBe('future-app');
  });

  it('requires appId for embed config before persistence', async () => {
    const response = await app.request('/api/embed/config', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('requires an initial message for embed feedback intake', async () => {
    const response = await app.request('/api/embed/feedback', {
      method: 'POST',
      body: JSON.stringify({
        appId: 'velvet',
        appName: 'Velvet',
        workspaceId: 'ws_test',
        userId: 'user_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('requires a body for embed conversation follow-up messages before persistence', async () => {
    const response = await app.request('/api/embed/conversations/conv_test/messages', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates conversation list query limits', async () => {
    const response = await app.request('/api/feedback/conversations?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates conversation list plan filters', async () => {
    const response = await app.request('/api/feedback/conversations?planId=starter', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates conversation follow-up query limits before persistence', async () => {
    const response = await app.request('/api/feedback/conversations/conv_test/follow-ups?limit=100', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin follow-up queue limits before persistence', async () => {
    const response = await app.request('/api/admin/follow-up-queue?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin action board filters before persistence', async () => {
    const response = await app.request('/api/admin/action-board?status=closed', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin app summary limits before persistence', async () => {
    const response = await app.request('/api/admin/app-summary?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin app summary date filters before persistence', async () => {
    const response = await app.request('/api/admin/app-summary?since=today', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin inbox query limits', async () => {
    const response = await app.request('/api/admin/inbox?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin inbox plan filters before persistence', async () => {
    const response = await app.request('/api/admin/inbox?planId=enterprise', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin triage queue query limits', async () => {
    const response = await app.request('/api/admin/triage-queue?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin triage queue status values before persistence', async () => {
    const response = await app.request('/api/admin/triage-queue?status=closed', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin inbox analysis filters before persistence', async () => {
    const response = await app.request('/api/admin/inbox?impact=Urgent', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin intake metrics date filters before persistence', async () => {
    const response = await app.request('/api/admin/intake-metrics?since=yesterday', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin intake metrics plan filters before persistence', async () => {
    const response = await app.request('/api/admin/intake-metrics?planId=starter', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin metadata quality date filters before persistence', async () => {
    const response = await app.request('/api/admin/metadata-quality?since=yesterday', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin issue brief limits before persistence', async () => {
    const response = await app.request('/api/admin/issue-briefs?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates ranking query limits before persistence', async () => {
    const response = await app.request('/api/feedback/rankings/bugs?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates issue source message limits before persistence', async () => {
    const response = await app.request('/api/feedback/issues/issue_test/source-messages?limit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin ranking query limits before persistence', async () => {
    const response = await app.request('/api/admin/rankings?requestLimit=500', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates admin status activity filters before persistence', async () => {
    const response = await app.request('/api/admin/status-activity?nextStatus=done', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates issue list filters before persistence', async () => {
    const response = await app.request('/api/feedback/issues?severity=Urgent&limit=10', {}, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates conversation status updates before persistence', async () => {
    const response = await app.request('/api/feedback/conversations/conv_test/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'resolved' }),
      headers: { 'Content-Type': 'application/json' },
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('validates issue status updates before persistence', async () => {
    const response = await app.request('/api/feedback/issues/issue_test/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'done' }),
      headers: { 'Content-Type': 'application/json' },
    }, env);

    expect(response.status).toBe(400);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });
});

function d1WithConversationColumns(columns: string[]) {
  return {
    prepare: () => ({
      all: async () => ({
        results: columns.map((name) => ({ name })),
      }),
    }),
  } as unknown as D1Database;
}
