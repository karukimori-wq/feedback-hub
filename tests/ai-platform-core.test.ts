import { describe, expect, it } from 'vitest';
import { analyzeWithAiPlatformCore } from '../src/ai-platform-core';

describe('AI Platform Core analysis client', () => {
  it('uses AI Platform Core analysis when the service returns a valid response', async () => {
    const service = {
      fetch: async () => new Response(JSON.stringify({
        analysis: {
          category: 'Bug',
          severity: 'Critical',
          impact: 'Critical',
          confidence: 0.91,
          summary: '保存処理でデータが残らない',
          normalizedProblem: 'save-persistence',
          suggestedQuestions: ['どの画面で発生しましたか？'],
          priorityComponents: { severityWeight: 10, countWeight: 1, impactWeight: 10 },
          priorityScore: 100,
        },
      }), { status: 200 }),
    } as unknown as Fetcher;

    const result = await analyzeWithAiPlatformCore({ AI_PLATFORM_CORE_SERVICE: service }, {
      text: '保存できない',
      conversationId: 'conv_test',
      workspaceId: 'ws_test',
      userId: 'user_test',
      appId: 'numeria-studio',
    });

    expect(result.source).toBe('ai-platform-core');
    expect(result.fallbackUsed).toBe(false);
    expect(result.analysis.category).toBe('Bug');
    expect(result.analysis.normalizedProblem).toBe('save-persistence');
  });

  it('falls back to deterministic analysis when AI Platform Core is unavailable', async () => {
    const result = await analyzeWithAiPlatformCore({}, {
      text: 'ログインできない',
      conversationId: 'conv_test',
    });

    expect(result.source).toBe('deterministic-fallback');
    expect(result.fallbackUsed).toBe(true);
    expect(result.analysis.category).toBe('Bug');
    expect(result.analysis.impact).toBe('Critical');
  });
});
