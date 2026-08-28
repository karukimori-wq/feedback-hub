import { describe, expect, it } from 'vitest';
import { explainUrgency } from '../src/repository';

describe('explainUrgency', () => {
  it('explains critical severity and impact', () => {
    const reasons = explainUrgency({
      severity: 'Critical',
      impact: 'Critical',
      count: 2,
    });

    expect(reasons).toContain('critical_severity');
    expect(reasons).toContain('critical_impact');
    expect(reasons).not.toContain('repeated_feedback_threshold');
  });

  it('explains repeated feedback threshold', () => {
    const reasons = explainUrgency({
      severity: 'Medium',
      impact: 'Medium',
      count: 30,
    });

    expect(reasons).toEqual(['repeated_feedback_threshold']);
  });
});
