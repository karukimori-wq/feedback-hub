import { describe, expect, it } from 'vitest';
import { explainUrgency, summarizeUrgentNotifications } from '../src/repository';

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

  it('summarizes urgent notifications by reason', () => {
    const summary = summarizeUrgentNotifications([
      {
        urgencyReasons: ['critical_severity', 'critical_impact'],
        priority_score: 90,
      },
      {
        urgencyReasons: ['repeated_feedback_threshold'],
        priority_score: 70,
      },
    ]);

    expect(summary.total).toBe(2);
    expect(summary.byReason.critical_severity).toBe(1);
    expect(summary.byReason.critical_impact).toBe(1);
    expect(summary.byReason.repeated_feedback_threshold).toBe(1);
    expect(summary.hasCritical).toBe(true);
    expect(summary.notificationLevel).toBe('critical');
    expect(summary.topPriorityScore).toBe(90);
  });
});
