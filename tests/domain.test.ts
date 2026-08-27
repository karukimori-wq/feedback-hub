import { describe, expect, it } from 'vitest';
import { analyzeFeedbackText, calculatePriorityScore, similarityScore } from '../src/domain';

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

  it('keeps priority formula auditable', () => {
    expect(calculatePriorityScore({ severityWeight: 10, countWeight: 3, impactWeight: 7 })).toBe(210);
  });
});

describe('similarityScore', () => {
  it('matches normalized save feedback strongly', () => {
    expect(similarityScore('保存できない', 'データが残らない')).toBe(1);
  });
});
