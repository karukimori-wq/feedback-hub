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
    const body = await response.json() as { identityMode: string; professionalIdRequired: boolean; endpoints: string[] };
    expect(body.identityMode).toBe('workspaceId+userId');
    expect(body.professionalIdRequired).toBe(false);
    expect(body.endpoints).toContain('POST /api/feedback/conversations');
  });
});
