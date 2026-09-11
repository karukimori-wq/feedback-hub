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
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'numeria_free_status_recovery', method: 'GET', path: '/api/embed/feedback/status?correlationId=SMOKE_CORRELATION_ID&sourceApp=numeria-studio' });
    expect(body.releaseSmoke.checks).toContainEqual({ key: 'velvet_pro_embed_intake', method: 'POST', path: '/api/embed/feedback' });
    expect(body.owns).toContain('Feedback AI Analysis');
    expect(body.doesNotOwn).toContain('Engineering task management');
    expect(body.doesNotOwn).toContain('Payment');
    expect(body.endpoints).toContain('GET /api/embed/config');
    expect(body.endpoints).toContain('POST /api/embed/feedback');
    expect(body.endpoints).toContain('GET /api/embed/feedback/status');
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
    expect(body.endpoints).toContain('GET /api/admin/issues/:issueId/evidence');
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
    expect(body.smokePlan.checks).toContainEqual({ key: 'numeria_free_status_recovery', method: 'GET', path: '/api/embed/feedback/status?correlationId=SMOKE_CORRELATION_ID&sourceApp=numeria-studio' });
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
          endpoints: { config: string; intake: string; feedbackStatus: string; followUpTemplate: string; conversationTemplate: string };
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
    expect(numeria?.endpoints.feedbackStatus).toBe('/api/embed/feedback/status');
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

  it('returns admin issue evidence with original voice and AI reasoning', async () => {
    const response = await app.request('/api/admin/issues/issue_save/evidence?limit=10', {}, {
      ...env,
      DB: d1ForIssueEvidence({
        issue: {
          issue_id: 'issue_save',
          canonical_title: '保存処理の不具合',
          normalized_problem: 'save-persistence',
          category: 'Bug',
          severity: 'Critical',
          impact: 'Critical',
          count: 32,
          priority_score: 1000,
          priority_components_json: '{"severityWeight":10,"countWeight":10,"impactWeight":10}',
          status: 'open',
        },
        messages: [
          {
            issue_link_id: 'link_1',
            similarity_score: 1,
            match_reason: 'similar-normalized-problem',
            conversation_id: 'conv_1',
            source_app: 'numeria-studio',
            plan_id: 'free',
            current_screen: '鑑定作成',
            correlation_id: 'corr_1',
            message_id: 'msg_1',
            role: 'user',
            body: '保存できない。登録してもデータが残らない',
          },
        ],
        analyses: [
          {
            analysis_id: 'ana_1',
            conversation_id: 'conv_1',
            category: 'Bug',
            severity: 'Critical',
            impact: 'Critical',
            confidence: 0.91,
            summary: '保存処理でデータが残らない',
            normalized_problem: 'save-persistence',
            suggested_questions_json: '["どの画面で発生しましたか？"]',
            metadata_json: '{"analysisSource":"ai-platform-core","fallbackUsed":false}',
            similarity_score: 1,
            match_reason: 'similar-normalized-problem',
          },
        ],
        appPlans: [
          { source_app: 'numeria-studio', plan_id: 'free', conversation_count: 1, message_count: 1 },
        ],
        statusEvents: [],
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      evidence: {
        issue: {
          issue_id: string;
          urgencyReasons: string[];
          recommendedAction: string;
          priorityComponents: { severityWeight?: number; countWeight?: number; impactWeight?: number };
        };
        evidenceSummary: {
          sourceConversationCount: number;
          sourceMessageCount: number;
          analysisCount: number;
          shouldNotifyAdmin: boolean;
          notificationReasons: string[];
          rawVoicePreservedAfterRedaction: boolean;
          developmentManagementOwnership: boolean;
        };
        analyses: Array<{ suggestedQuestions: string[]; metadata: { analysisSource?: string; fallbackUsed?: boolean } }>;
        sourceMessages: Array<{ body: string; source_app: string; plan_id: string }>;
        filters: { limit: number };
      };
    };

    expect(body.evidence.issue.issue_id).toBe('issue_save');
    expect(body.evidence.issue.urgencyReasons).toEqual(['critical_severity', 'critical_impact', 'repeated_feedback_threshold']);
    expect(body.evidence.issue.recommendedAction).toBe('triage_now');
    expect(body.evidence.issue.priorityComponents.severityWeight).toBe(10);
    expect(body.evidence.evidenceSummary.sourceConversationCount).toBe(1);
    expect(body.evidence.evidenceSummary.sourceMessageCount).toBe(1);
    expect(body.evidence.evidenceSummary.analysisCount).toBe(1);
    expect(body.evidence.evidenceSummary.shouldNotifyAdmin).toBe(true);
    expect(body.evidence.evidenceSummary.notificationReasons).toContain('repeated_feedback_threshold');
    expect(body.evidence.evidenceSummary.rawVoicePreservedAfterRedaction).toBe(true);
    expect(body.evidence.evidenceSummary.developmentManagementOwnership).toBe(false);
    expect(body.evidence.analyses[0].suggestedQuestions).toEqual(['どの画面で発生しましたか？']);
    expect(body.evidence.analyses[0].metadata.analysisSource).toBe('ai-platform-core');
    expect(body.evidence.analyses[0].metadata.fallbackUsed).toBe(false);
    expect(body.evidence.sourceMessages[0].body).toContain('保存できない');
    expect(body.evidence.sourceMessages[0].source_app).toBe('numeria-studio');
    expect(body.evidence.sourceMessages[0].plan_id).toBe('free');
    expect(body.evidence.filters.limit).toBe(10);
  });

  it('returns not found for missing admin issue evidence', async () => {
    const response = await app.request('/api/admin/issues/missing/evidence', {}, {
      ...env,
      DB: d1ForIssueEvidence({ issue: null, messages: [], analyses: [], appPlans: [], statusEvents: [] }),
    });

    expect(response.status).toBe(404);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('ISSUE_NOT_FOUND');
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
        feedbackStatusEndpoint: string;
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
    expect(body.config.feedbackStatusEndpoint).toBe('/api/embed/feedback/status');
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

  it('returns embed feedback status by correlation id', async () => {
    const response = await app.request('/api/embed/feedback/status?correlationId=corr_1&sourceApp=numeria-studio', {}, {
      ...env,
      DB: d1ForEmbedFeedbackStatus({
        lookup: { conversation_id: 'conv_1' },
        conversation: {
          conversation_id: 'conv_1',
          app_id: 'numeria-studio',
          source_app: 'numeria-studio',
          app_name: 'Numeria Studio',
          plan_id: 'free',
          workspace_id: 'ws_1',
          user_id: 'user_1',
          current_screen: '鑑定作成',
          correlation_id: 'corr_1',
          status: 'open',
        },
        messages: [
          { message_id: 'msg_1', conversation_id: 'conv_1', role: 'user', body: '保存できない', created_at: '2026-09-11T00:00:00.000Z' },
        ],
        analyses: [
          {
            analysis_id: 'ana_1',
            category: 'Bug',
            severity: 'Critical',
            impact: 'Critical',
            confidence: 0.91,
            summary: '保存処理で失敗する',
            normalized_problem: 'save-persistence',
            suggested_questions_json: '["どの画面で発生しましたか？"]',
            created_at: '2026-09-11T00:00:01.000Z',
          },
        ],
        issueLinks: [
          {
            issue_id: 'issue_1',
            canonical_title: '保存処理の不具合',
            category: 'Bug',
            severity: 'Critical',
            impact: 'Critical',
            count: 1,
            priority_score: 100,
            status: 'open',
            similarity_score: 1,
            match_reason: 'new-canonical-issue',
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      feedbackStatus: {
        lookup: { correlationId: string; sourceApp: string | null };
        conversation: { conversation_id: string; source_app: string; correlation_id: string };
        latestAnalysis: { category: string; suggestedQuestions: string[] };
        issue: { issueId: string; title: string; matchReason: string };
        intake: { nextAction: string; followUpQuestions: string[] };
      };
    };
    expect(body.feedbackStatus.lookup.correlationId).toBe('corr_1');
    expect(body.feedbackStatus.lookup.sourceApp).toBe('numeria-studio');
    expect(body.feedbackStatus.conversation.conversation_id).toBe('conv_1');
    expect(body.feedbackStatus.latestAnalysis.category).toBe('Bug');
    expect(body.feedbackStatus.latestAnalysis.suggestedQuestions).toEqual(['どの画面で発生しましたか？']);
    expect(body.feedbackStatus.issue.issueId).toBe('issue_1');
    expect(body.feedbackStatus.issue.title).toBe('保存処理の不具合');
    expect(body.feedbackStatus.issue.matchReason).toBe('new-canonical-issue');
    expect(body.feedbackStatus.intake.nextAction).toBe('ask_follow_up');
  });

  it('returns not found for missing embed feedback status', async () => {
    const response = await app.request('/api/embed/feedback/status?correlationId=missing', {}, {
      ...env,
      DB: d1ForEmbedFeedbackStatus({
        lookup: null,
        conversation: null,
        messages: [],
        analyses: [],
        issueLinks: [],
      }),
    });

    expect(response.status).toBe(404);
    const body = await response.json() as { status: string; errorCode: string };
    expect(body.status).toBe('error');
    expect(body.errorCode).toBe('FEEDBACK_STATUS_NOT_FOUND');
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

  it('requires correlation id for embed feedback status before persistence', async () => {
    const response = await app.request('/api/embed/feedback/status', {}, env);

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

  it('validates admin issue evidence limits before persistence', async () => {
    const response = await app.request('/api/admin/issues/issue_test/evidence?limit=500', {}, env);

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

function d1ForIssueEvidence(data: {
  issue: Record<string, unknown> | null;
  messages: Array<Record<string, unknown>>;
  analyses: Array<Record<string, unknown>>;
  appPlans: Array<Record<string, unknown>>;
  statusEvents: Array<Record<string, unknown>>;
}) {
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => data.issue,
        all: async () => {
          if (sql.includes('GROUP BY c.source_app')) return { results: data.appPlans };
          if (sql.includes('JOIN feedback_messages m')) return { results: data.messages };
          if (sql.includes('JOIN feedback_ai_analyses a')) return { results: data.analyses };
          if (sql.includes('feedback_issue_status_events')) return { results: data.statusEvents };
          return { results: [] };
        },
      }),
    }),
  } as unknown as D1Database;
}

function d1ForEmbedFeedbackStatus(data: {
  lookup: Record<string, unknown> | null;
  conversation: Record<string, unknown> | null;
  messages: Array<Record<string, unknown>>;
  analyses: Array<Record<string, unknown>>;
  issueLinks: Array<Record<string, unknown>>;
}) {
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes('correlation_id = ?')) return data.lookup;
          if (sql.includes('SELECT * FROM feedback_conversations WHERE conversation_id = ?')) return data.conversation;
          return null;
        },
        all: async () => {
          if (sql.includes('FROM feedback_messages')) return { results: data.messages };
          if (sql.includes('FROM feedback_ai_analyses')) return { results: data.analyses };
          if (sql.includes('FROM feedback_issue_links fil')) return { results: data.issueLinks };
          return { results: [] };
        },
      }),
    }),
  } as unknown as D1Database;
}
