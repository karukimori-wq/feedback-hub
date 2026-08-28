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
      endpoints: string[];
    };
    expect(body.identityMode).toBe('workspaceId+userId');
    expect(body.professionalIdRequired).toBe(false);
    expect(body.aiProvider).toBe('ai-platform-core');
    expect(body.localAiUsage).toBe('fallback-only');
    expect(body.endpoints).toContain('POST /api/feedback/intake');
    expect(body.endpoints).toContain('GET /api/feedback/conversations');
    expect(body.endpoints).toContain('POST /api/feedback/conversations');
    expect(body.endpoints).toContain('GET /api/feedback/conversations/:conversationId');
    expect(body.endpoints).toContain('POST /api/feedback/conversations/:conversationId/status');
    expect(body.endpoints).toContain('GET /api/persistence/status');
    expect(body.endpoints).toContain('POST /api/persistence/roundtrip');
    expect(body.endpoints).toContain('POST /api/feedback/issues/:issueId/status');
    expect(body.endpoints).toContain('GET /api/feedback/notifications/urgent/summary');
    expect(body.endpoints).toContain('GET /api/admin/inbox');
    expect(body.endpoints).toContain('GET /api/admin/issue-summary');
    expect(body.endpoints).toContain('GET /api/admin/triage-queue');
    expect(body.endpoints).toContain('GET /api/admin/overview');
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

  it('validates conversation list query limits', async () => {
    const response = await app.request('/api/feedback/conversations?limit=500', {}, env);

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
