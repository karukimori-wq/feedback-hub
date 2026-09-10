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
      releaseSmoke: { command: string; checks: Array<{ key: string; method: string; path: string }> };
      owns: string[];
      doesNotOwn: string[];
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
    expect(body.releaseSmoke.command).toContain('smoke:release-intake');
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'release_readiness', method: 'GET', path: '/api/admin/release-readiness' });
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'external_intelligence_snapshot', method: 'GET', path: '/api/admin/external-intelligence-snapshot' });
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'source_app_contracts', method: 'GET', path: '/api/admin/source-app-contracts' });
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'release_intake_summary', method: 'GET', path: '/api/admin/release-intake-summary' });
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'velvet_pro_embed_intake', method: 'POST', path: '/api/embed/feedback' });
    expect(body.owns).toContain('Feedback AI Analysis');
    expect(body.doesNotOwn).toContain('Engineering task management');
    expect(body.doesNotOwn).toContain('Payment');
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
    expect(body.endpoints).toContain('GET /api/admin/release-intake-summary');
    expect(body.endpoints).toContain('GET /api/admin/release-readiness');
    expect(body.endpoints).toContain('GET /api/admin/release-smoke-plan');
    expect(body.endpoints).toContain('GET /api/admin/external-intelligence-snapshot');
    expect(body.endpoints).toContain('GET /api/admin/source-app-contracts');
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

  it('returns the release smoke plan for external monitoring', async () => {
    const response = await app.request('/api/admin/release-smoke-plan', {}, env);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      smokePlan: {
        sourceApps: string[];
        planIds: string[];
        command: string;
        checks: Array<{ key: string; method: string; path: string }>;
        samplePayloads: {
          numeriaStudioFree: { appId: string; planId: string; requiredContextFields: string[] };
          velvetPro: { appId: string; planId: string; requiredContextFields: string[] };
        };
        bodyRules: {
          includePaymentDetails: boolean;
          includeSecretValues: boolean;
          rawVoicePreservedAfterRedaction: boolean;
        };
      };
    };
    expect(body.smokePlan.sourceApps).toEqual(['numeria-studio', 'velvet']);
    expect(body.smokePlan.planIds).toEqual(['free', 'pro']);
    expect(body.smokePlan.command).toContain('smoke:release-intake');
    expect(body.smokePlan.checks).toContainEqual({ key: 'external_intelligence_snapshot', method: 'GET', path: '/api/admin/external-intelligence-snapshot' });
    expect(body.smokePlan.checks).toContainEqual({ key: 'source_app_contracts', method: 'GET', path: '/api/admin/source-app-contracts' });
    expect(body.smokePlan.checks).toContainEqual({ key: 'release_intake_summary', method: 'GET', path: '/api/admin/release-intake-summary' });
    expect(body.smokePlan.checks).toContainEqual({ key: 'numeria_free_intake', method: 'POST', path: '/api/feedback/intake' });
    expect(body.smokePlan.samplePayloads.numeriaStudioFree.appId).toBe('numeria-studio');
    expect(body.smokePlan.samplePayloads.numeriaStudioFree.planId).toBe('free');
    expect(body.smokePlan.samplePayloads.numeriaStudioFree.requiredContextFields).toContain('correlationId');
    expect(body.smokePlan.samplePayloads.velvetPro.appId).toBe('velvet');
    expect(body.smokePlan.samplePayloads.velvetPro.planId).toBe('pro');
    expect(body.smokePlan.bodyRules.includePaymentDetails).toBe(false);
    expect(body.smokePlan.bodyRules.includeSecretValues).toBe(false);
    expect(body.smokePlan.bodyRules.rawVoicePreservedAfterRedaction).toBe(true);
  });

  it('returns an External Intelligence handoff snapshot', async () => {
    const response = await app.request('/api/admin/external-intelligence-snapshot', {}, env);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      snapshot: {
        appName: string;
        snapshotVersion: string;
        sections: string[];
        identity: { role: string; identityMode: string; professionalIdRequired: boolean };
        responsibilityBoundary: {
          owns: string[];
          doesNotOwn: string[];
          sourceAppUiOwner: string;
          processingOwner: string;
        };
        releaseScope: {
          sourceApps: string[];
          acceptedSourceApps: string[];
          planIds: string[];
          futurePlanIds: string[];
          requiredContextFields: string[];
          bugReportsRateLimitedByPlan: boolean;
        };
        intakeContract: {
          appOwnedEntryLabel: string;
          intakeEndpoint: string;
          sensitiveBodyRules: { redactBeforePersistence: boolean; storePaymentDetails: boolean; storeSecretValues: boolean };
        };
        aiProcessing: { provider: string; localAiUsage: string; knowledgeScopeBySourceApp: boolean };
        analysisOutputs: {
          conversationModel: string[];
          categories: string[];
          grouping: string;
          priorityFormula: string;
          rawVoicePreservedAfterRedaction: boolean;
        };
        adminSignals: { urgentNotificationRules: string[]; aggregations: string[] };
        handoffTargets: {
          externalIntelligenceSystem: { recommendedIngestEndpoint: string };
          professionalPlatformContracts: { contractEndpoint: string; handoffEndpoint: string; sourceAppContractsEndpoint: string };
          platformAdmin: { readinessEndpoint: string; smokePlanEndpoint: string; sourceAppContractsEndpoint: string; releaseIntakeSummaryEndpoint: string };
        };
      };
    };
    expect(body.snapshot.appName).toBe('feedback-hub');
    expect(body.snapshot.snapshotVersion).toBe('feedback-hub.external-intelligence.v1');
    expect(body.snapshot.sections).toContain('responsibilityBoundary');
    expect(body.snapshot.identity.role).toBe('user-voice-intelligence');
    expect(body.snapshot.identity.identityMode).toBe('workspaceId+userId');
    expect(body.snapshot.identity.professionalIdRequired).toBe(false);
    expect(body.snapshot.responsibilityBoundary.owns).toContain('Feedback AI Analysis');
    expect(body.snapshot.responsibilityBoundary.doesNotOwn).toContain('Question box visual UI');
    expect(body.snapshot.responsibilityBoundary.doesNotOwn).toContain('Engineering task management');
    expect(body.snapshot.responsibilityBoundary.doesNotOwn).toContain('Plan billing management');
    expect(body.snapshot.responsibilityBoundary.sourceAppUiOwner).toBe('source-app');
    expect(body.snapshot.responsibilityBoundary.processingOwner).toBe('feedback-hub');
    expect(body.snapshot.releaseScope.sourceApps).toEqual(['numeria-studio', 'velvet']);
    expect(body.snapshot.releaseScope.acceptedSourceApps).toContain('sns-planner');
    expect(body.snapshot.releaseScope.planIds).toEqual(['free', 'pro']);
    expect(body.snapshot.releaseScope.futurePlanIds).toEqual(['business']);
    expect(body.snapshot.releaseScope.requiredContextFields).toContain('correlationId');
    expect(body.snapshot.releaseScope.bugReportsRateLimitedByPlan).toBe(false);
    expect(body.snapshot.intakeContract.appOwnedEntryLabel).toBe('質問・改善');
    expect(body.snapshot.intakeContract.intakeEndpoint).toBe('/api/embed/feedback');
    expect(body.snapshot.intakeContract.sensitiveBodyRules.redactBeforePersistence).toBe(true);
    expect(body.snapshot.intakeContract.sensitiveBodyRules.storePaymentDetails).toBe(false);
    expect(body.snapshot.intakeContract.sensitiveBodyRules.storeSecretValues).toBe(false);
    expect(body.snapshot.aiProcessing.provider).toBe('ai-platform-core');
    expect(body.snapshot.aiProcessing.localAiUsage).toBe('fallback-only');
    expect(body.snapshot.aiProcessing.knowledgeScopeBySourceApp).toBe(true);
    expect(body.snapshot.analysisOutputs.conversationModel).toEqual(['Conversation', 'Message', 'AI Analysis', 'Issue']);
    expect(body.snapshot.analysisOutputs.categories).toContain('Bug');
    expect(body.snapshot.analysisOutputs.grouping).toBe('similar-feedback-to-canonical-issue');
    expect(body.snapshot.analysisOutputs.priorityFormula).toBe('severity * count * impact');
    expect(body.snapshot.analysisOutputs.rawVoicePreservedAfterRedaction).toBe(true);
    expect(body.snapshot.adminSignals.urgentNotificationRules).toContain('same issue count >= 30');
    expect(body.snapshot.adminSignals.aggregations).toContain('planId');
    expect(body.snapshot.handoffTargets.externalIntelligenceSystem.recommendedIngestEndpoint).toBe('/api/admin/external-intelligence-snapshot');
    expect(body.snapshot.handoffTargets.professionalPlatformContracts.contractEndpoint).toBe('/contracts/status');
    expect(body.snapshot.handoffTargets.professionalPlatformContracts.handoffEndpoint).toBe('/api/admin/external-intelligence-snapshot');
    expect(body.snapshot.handoffTargets.professionalPlatformContracts.sourceAppContractsEndpoint).toBe('/api/admin/source-app-contracts');
    expect(body.snapshot.handoffTargets.platformAdmin.readinessEndpoint).toBe('/api/admin/release-readiness');
    expect(body.snapshot.handoffTargets.platformAdmin.smokePlanEndpoint).toBe('/api/admin/release-smoke-plan');
    expect(body.snapshot.handoffTargets.platformAdmin.sourceAppContractsEndpoint).toBe('/api/admin/source-app-contracts');
    expect(body.snapshot.handoffTargets.platformAdmin.releaseIntakeSummaryEndpoint).toBe('/api/admin/release-intake-summary');
  });

  it('returns source app contracts for release app handoff', async () => {
    const response = await app.request('/api/admin/source-app-contracts', {}, env);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      sourceAppContracts: {
        releaseReadySourceApps: string[];
        supportedSourceApps: string[];
        contracts: Array<{
          appId: string;
          appName: string;
          sourceApp: string;
          releaseReady: boolean;
          entryLabel: string;
          uiOwner: string;
          processingOwner: string;
          aiProvider: string;
          knowledgeScope: string;
          endpoints: { config: string; intake: string; followUpTemplate: string; conversationTemplate: string };
          requiredFields: string[];
          autoContextFields: string[];
          acceptedPlanIds: string[];
          releasePlanIds: string[];
          bugReportsRateLimitedByPlan: boolean;
          supportedCategories: string[];
          responseModes: string[];
          bodyRules: {
            sendPaymentDetails: boolean;
            sendSecretValues: boolean;
            redactedBeforePersistence: boolean;
            rawVoicePreservedAfterRedaction: boolean;
          };
        }>;
      };
    };
    expect(body.sourceAppContracts.releaseReadySourceApps).toEqual(['numeria-studio', 'velvet']);
    expect(body.sourceAppContracts.supportedSourceApps).toContain('growth-engine');

    const numeria = body.sourceAppContracts.contracts.find((contract) => contract.appId === 'numeria-studio');
    const velvet = body.sourceAppContracts.contracts.find((contract) => contract.appId === 'velvet');
    expect(numeria).toBeDefined();
    expect(velvet).toBeDefined();
    expect(numeria?.appName).toBe('Numeria Studio');
    expect(numeria?.sourceApp).toBe('numeria-studio');
    expect(numeria?.releaseReady).toBe(true);
    expect(numeria?.entryLabel).toBe('質問・改善');
    expect(numeria?.uiOwner).toBe('source-app');
    expect(numeria?.processingOwner).toBe('feedback-hub');
    expect(numeria?.aiProvider).toBe('ai-platform-core');
    expect(numeria?.knowledgeScope).toBe('numeria-studio');
    expect(numeria?.endpoints.config).toBe('/api/embed/config?appId=numeria-studio');
    expect(numeria?.endpoints.intake).toBe('/api/embed/feedback');
    expect(numeria?.requiredFields).toContain('initialMessage');
    expect(numeria?.requiredFields).toContain('correlationId');
    expect(numeria?.autoContextFields).toContain('browser');
    expect(numeria?.acceptedPlanIds).toEqual(['free', 'pro', 'business']);
    expect(numeria?.releasePlanIds).toEqual(['free', 'pro']);
    expect(numeria?.bugReportsRateLimitedByPlan).toBe(false);
    expect(numeria?.supportedCategories).toContain('Bug');
    expect(numeria?.responseModes).toContain('ask_follow_up');
    expect(numeria?.bodyRules.sendPaymentDetails).toBe(false);
    expect(numeria?.bodyRules.sendSecretValues).toBe(false);
    expect(numeria?.bodyRules.redactedBeforePersistence).toBe(true);
    expect(numeria?.bodyRules.rawVoicePreservedAfterRedaction).toBe(true);

    expect(velvet?.appName).toBe('Velvet');
    expect(velvet?.sourceApp).toBe('velvet');
    expect(velvet?.releaseReady).toBe(true);
    expect(velvet?.releasePlanIds).toEqual(['free', 'pro']);
  });

  it('returns release intake summary by app and plan', async () => {
    const response = await app.request('/api/admin/release-intake-summary?since=2026-09-10T00:00:00.000Z', {}, {
      ...env,
      DB: d1WithReleaseIntakeSummaryRows([
        {
          source_app: 'numeria-studio',
          app_name: 'Numeria Studio',
          plan_id: 'free',
          conversation_count: 3,
          analysis_count: 3,
          issue_count: 2,
          urgent_issue_count: 1,
          free_plan_limit_question_count: 2,
          pro_upgrade_issue_count: 0,
          billing_issue_count: 0,
          data_loss_issue_count: 1,
          metadata_incomplete_count: 1,
          last_conversation_at: '2026-09-10T01:00:00.000Z',
        },
        {
          source_app: 'velvet',
          app_name: 'Velvet',
          plan_id: 'pro',
          conversation_count: 1,
          analysis_count: 1,
          issue_count: 1,
          urgent_issue_count: 0,
          free_plan_limit_question_count: 0,
          pro_upgrade_issue_count: 1,
          billing_issue_count: 0,
          data_loss_issue_count: 0,
          metadata_incomplete_count: 0,
          last_conversation_at: '2026-09-10T02:00:00.000Z',
        },
      ]),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      releaseIntakeSummary: {
        releaseScope: { sourceApps: string[]; planIds: string[]; requiredContextFields: string[] };
        totals: { conversations: number; urgentIssues: number; metadataIncompleteConversations: number; segmentsNeedingAttention: number };
        segments: Array<{
          sourceApp: string;
          planId: string;
          releaseReady: boolean;
          intakeObserved: boolean;
          conversationCount: number;
          urgentIssueCount: number;
          metadataIncompleteCount: number;
          freePlanLimitQuestionCount: number;
          proUpgradeIssueCount: number;
          needsAttention: boolean;
          attentionReasons: string[];
          contract: { uiOwner: string; processingOwner: string; aiProvider: string; bugReportsRateLimitedByPlan: boolean; requiredFields: string[] };
        }>;
        safeguards: { sourceAppUiOwner: string; aiProvider: string; paymentDetailsStoredInBody: boolean; secretValuesStoredInBody: boolean };
        filters: { since: string | null };
      };
    };

    expect(body.releaseIntakeSummary.releaseScope.sourceApps).toEqual(['numeria-studio', 'velvet']);
    expect(body.releaseIntakeSummary.releaseScope.planIds).toEqual(['free', 'pro']);
    expect(body.releaseIntakeSummary.releaseScope.requiredContextFields).toContain('correlationId');
    expect(body.releaseIntakeSummary.totals.conversations).toBe(4);
    expect(body.releaseIntakeSummary.totals.urgentIssues).toBe(1);
    expect(body.releaseIntakeSummary.totals.metadataIncompleteConversations).toBe(1);
    expect(body.releaseIntakeSummary.totals.segmentsNeedingAttention).toBe(1);
    expect(body.releaseIntakeSummary.segments).toHaveLength(4);

    const numeriaFree = body.releaseIntakeSummary.segments.find((segment) => segment.sourceApp === 'numeria-studio' && segment.planId === 'free');
    const numeriaPro = body.releaseIntakeSummary.segments.find((segment) => segment.sourceApp === 'numeria-studio' && segment.planId === 'pro');
    const velvetPro = body.releaseIntakeSummary.segments.find((segment) => segment.sourceApp === 'velvet' && segment.planId === 'pro');
    expect(numeriaFree?.releaseReady).toBe(true);
    expect(numeriaFree?.intakeObserved).toBe(true);
    expect(numeriaFree?.conversationCount).toBe(3);
    expect(numeriaFree?.urgentIssueCount).toBe(1);
    expect(numeriaFree?.metadataIncompleteCount).toBe(1);
    expect(numeriaFree?.freePlanLimitQuestionCount).toBe(2);
    expect(numeriaFree?.needsAttention).toBe(true);
    expect(numeriaFree?.attentionReasons).toEqual(['urgent_issue_present', 'metadata_incomplete']);
    expect(numeriaFree?.contract.uiOwner).toBe('source-app');
    expect(numeriaFree?.contract.processingOwner).toBe('feedback-hub');
    expect(numeriaFree?.contract.aiProvider).toBe('ai-platform-core');
    expect(numeriaFree?.contract.bugReportsRateLimitedByPlan).toBe(false);
    expect(numeriaFree?.contract.requiredFields).toContain('initialMessage');
    expect(numeriaPro?.intakeObserved).toBe(false);
    expect(numeriaPro?.conversationCount).toBe(0);
    expect(velvetPro?.proUpgradeIssueCount).toBe(1);
    expect(body.releaseIntakeSummary.safeguards.sourceAppUiOwner).toBe('source-app');
    expect(body.releaseIntakeSummary.safeguards.aiProvider).toBe('ai-platform-core');
    expect(body.releaseIntakeSummary.safeguards.paymentDetailsStoredInBody).toBe(false);
    expect(body.releaseIntakeSummary.safeguards.secretValuesStoredInBody).toBe(false);
    expect(body.releaseIntakeSummary.filters.since).toBe('2026-09-10T00:00:00.000Z');
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

  it('validates release intake summary date filters before persistence', async () => {
    const response = await app.request('/api/admin/release-intake-summary?since=today', {}, env);

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

function d1WithReleaseIntakeSummaryRows(rows: Array<Record<string, unknown>>) {
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: rows }),
      }),
    }),
  } as unknown as D1Database;
}
