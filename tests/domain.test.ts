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

  it('classifies release-specific plan and product failures', () => {
    expect(analyzeFeedbackText('Pro契約の更新方法を教えてください').normalizedProblem).toBe('pro-contract-question');
    expect(analyzeFeedbackText('ログインできないので鑑定が開けません').normalizedProblem).toBe('auth-login-error');
    expect(analyzeFeedbackText('PDF出力できない。エラーになります').normalizedProblem).toBe('pdf-export-error');
    expect(analyzeFeedbackText('AI補助が使えない。APCエラーです').normalizedProblem).toBe('ai-runtime-error');
    expect(analyzeFeedbackText('課金したのに決済エラーになりました').normalizedProblem).toBe('billing-payment-issue');
    expect(analyzeFeedbackText('鑑定履歴が消えた。データ消失かもしれない').normalizedProblem).toBe('data-loss-suspected');
  });

  it('keeps priority formula auditable', () => {
    expect(calculatePriorityScore({ severityWeight: 10, countWeight: 3, impactWeight: 7 })).toBe(210);
  });
});

describe('redactSensitiveText', () => {
  it('redacts payment data, secrets, and emails before persistence', () => {
    const redacted = redactSensitiveText('card 4242 4242 4242 4242 sk_live_abcdefghijklmnop whsec_live_abcdefghijklmnop user@example.com');

    expect(redacted).toContain('[REDACTED_PAYMENT_CARD]');
    expect(redacted).toContain('[REDACTED_SECRET]');
    expect(redacted).toContain('[REDACTED_EMAIL]');
    expect(redacted).not.toContain('4242 4242 4242 4242');
    expect(redacted).not.toContain('sk_live_abcdefghijklmnop');
    expect(redacted).not.toContain('whsec_live_abcdefghijklmnop');
    expect(redacted).not.toContain('user@example.com');
  });

  it('redacts full appraisal, conversation, and customer master pasted content', () => {
    const redacted = redactSensitiveText('不具合です\n鑑定本文: ここに長い鑑定本文があります\n画面: レポート\n顧客マスター: 顧客の詳細一覧');

    expect(redacted).toContain('鑑定本文: [REDACTED_FULL_CONTENT]');
    expect(redacted).toContain('顧客マスター: [REDACTED_FULL_CONTENT]');
    expect(redacted).not.toContain('ここに長い鑑定本文があります');
    expect(redacted).not.toContain('顧客の詳細一覧');
  });
});

describe('similarityScore', () => {
  it('matches normalized save feedback strongly', () => {
    expect(similarityScore('保存できない', 'データが残らない')).toBe(1);
  });
});
