import { describe, expect, it } from 'vitest';
import { analyzeFeedbackText, calculatePriorityScore, similarityScore } from '../src/domain';
import { redactSensitiveText } from '../src/repository';

describe('analyzeFeedbackText', () => {
  it('classifies save failures as a critical bug', () => {
    const result = analyzeFeedbackText('保存できない。登録してもデータが残らない');

    expect(result.category).toBe('Bug');
    expect(result.severity).toBe('Critical');
    expect(result.impact).toBe('Critical');
    expect(result.normalizedProblem).toBe('save-persistence');
    expect(result.priorityScore).toBe(100);
  });

  it('classifies comparison requests as a feature request', () => {
    const result = analyzeFeedbackText('前回との比較を見たいです');

    expect(result.category).toBe('Feature Request');
    expect(result.normalizedProblem).toBe('comparison-view');
  });

  it('classifies Free plan limit questions as questions', () => {
    const result = analyzeFeedbackText('Freeプランの月間上限はどこで確認できますか？');

    expect(result.category).toBe('Question');
    expect(result.normalizedProblem).toBe('free-plan-limit-question');
  });

  it('classifies Pro upgrade reflection failures as critical bugs', () => {
    const result = analyzeFeedbackText('ProにアップグレードしたのにProが反映されない');

    expect(result.category).toBe('Bug');
    expect(result.severity).toBe('Critical');
    expect(result.impact).toBe('Critical');
    expect(result.normalizedProblem).toBe('pro-upgrade-entitlement');
  });

  it('keeps priority formula auditable', () => {
    expect(calculatePriorityScore({ severityWeight: 10, countWeight: 3, impactWeight: 7 })).toBe(210);
  });
});

describe('redactSensitiveText', () => {
  it('redacts payment data, secrets, and emails before persistence', () => {
    const redacted = redactSensitiveText('card 4242 4242 4242 4242 sk_live_abcdefghijklmnop user@example.com');

    expect(redacted).toContain('[REDACTED_PAYMENT_CARD]');
    expect(redacted).toContain('[REDACTED_SECRET]');
    expect(redacted).toContain('[REDACTED_EMAIL]');
    expect(redacted).not.toContain('4242 4242 4242 4242');
    expect(redacted).not.toContain('sk_live_abcdefghijklmnop');
    expect(redacted).not.toContain('user@example.com');
  });
});

describe('similarityScore', () => {
  it('matches normalized save feedback strongly', () => {
    expect(similarityScore('保存できない', 'データが残らない')).toBe(1);
  });
});
