import { analyzeFeedbackText, calculatePriorityScore, type FeedbackAnalysis } from './domain';

export interface AiPlatformCoreEnv {
  AI_PLATFORM_CORE_SERVICE?: Fetcher;
  AI_PLATFORM_CORE_BASE_URL?: string;
  AI_PLATFORM_CORE_TOKEN?: string;
}

export interface FeedbackAnalysisResult {
  analysis: FeedbackAnalysis;
  source: 'ai-platform-core' | 'deterministic-fallback';
  fallbackUsed: boolean;
}

export async function analyzeWithAiPlatformCore(
  env: AiPlatformCoreEnv,
  input: {
    text: string;
    conversationId: string;
    workspaceId?: string;
    userId?: string;
    appId?: string;
  },
): Promise<FeedbackAnalysisResult> {
  const response = await callAiPlatformCore(env, input);
  if (!response) {
    return {
      analysis: analyzeFeedbackText(input.text || 'No message provided'),
      source: 'deterministic-fallback',
      fallbackUsed: true,
    };
  }

  return {
    analysis: normalizeAiPlatformCoreAnalysis(await response.json(), input.text),
    source: 'ai-platform-core',
    fallbackUsed: false,
  };
}

async function callAiPlatformCore(
  env: AiPlatformCoreEnv,
  input: {
    text: string;
    conversationId: string;
    workspaceId?: string;
    userId?: string;
    appId?: string;
  },
) {
  const body = JSON.stringify({
    capability: 'feedback.analysis.v1',
    appName: 'feedback-hub',
    operation: 'analyze_feedback',
    input,
  });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (env.AI_PLATFORM_CORE_TOKEN) headers.set('Authorization', `Bearer ${env.AI_PLATFORM_CORE_TOKEN}`);

  try {
    if (env.AI_PLATFORM_CORE_SERVICE) {
      const response = await env.AI_PLATFORM_CORE_SERVICE.fetch('https://ai-platform-core/v1/ai/feedback/analyze', {
        method: 'POST',
        headers,
        body,
      });
      return response.ok ? response : null;
    }

    if (env.AI_PLATFORM_CORE_BASE_URL) {
      const response = await fetch(new URL('/v1/ai/feedback/analyze', env.AI_PLATFORM_CORE_BASE_URL), {
        method: 'POST',
        headers,
        body,
      });
      return response.ok ? response : null;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeAiPlatformCoreAnalysis(value: unknown, fallbackText: string): FeedbackAnalysis {
  const fallback = analyzeFeedbackText(fallbackText || 'No message provided');
  const candidate = extractObject(value);
  const category = pick(candidate.category, ['Question', 'Bug', 'Improvement', 'Feature Request', 'UX Feedback', 'Other'], fallback.category);
  const severity = pick(candidate.severity, ['Critical', 'High', 'Medium', 'Low'], fallback.severity);
  const impact = pick(candidate.impact, ['Critical', 'High', 'Medium', 'Low'], fallback.impact);
  const priorityComponents = {
    severityWeight: Number(candidate.priorityComponents?.severityWeight ?? fallback.priorityComponents.severityWeight),
    countWeight: Number(candidate.priorityComponents?.countWeight ?? fallback.priorityComponents.countWeight),
    impactWeight: Number(candidate.priorityComponents?.impactWeight ?? fallback.priorityComponents.impactWeight),
  };

  return {
    category,
    severity,
    impact,
    confidence: Number(candidate.confidence ?? fallback.confidence),
    summary: typeof candidate.summary === 'string' ? candidate.summary : fallback.summary,
    normalizedProblem: typeof candidate.normalizedProblem === 'string' ? candidate.normalizedProblem : fallback.normalizedProblem,
    suggestedQuestions: Array.isArray(candidate.suggestedQuestions) ? candidate.suggestedQuestions.filter((item): item is string => typeof item === 'string') : fallback.suggestedQuestions,
    priorityComponents,
    priorityScore: Number(candidate.priorityScore ?? calculatePriorityScore(priorityComponents)),
  };
}

function extractObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, any>;
  if (record.analysis && typeof record.analysis === 'object') return record.analysis;
  if (record.output && typeof record.output === 'object') return record.output;
  if (record.result && typeof record.result === 'object') return record.result;
  return record;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}
