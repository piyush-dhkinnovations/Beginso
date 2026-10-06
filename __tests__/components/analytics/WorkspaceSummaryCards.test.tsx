/**
 * __tests__/components/analytics/WorkspaceSummaryCards.test.tsx
 * Tests: WorkspaceSummaryCards — 4-card grid (Total Responses / Active Forms / Avg. Responses per
 * Form / Completion Rate), change vs the previous period, skeleton, zero/dash-muted values
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceSummaryCards } from '@/components/analytics/WorkspaceSummaryCards';

const NO_CHANGE = { responses: null, average: null, completion: null };
const BASE = {
  totalResponses: 0,
  activeForms: 0,
  totalForms: 0,
  averageResponsesPerForm: 0,
  completionRate: null,
  changes: NO_CHANGE,
  periodLabel: 'vs previous 30 days',
  perFormResponses: [],
};

describe('WorkspaceSummaryCards', () => {
  it('renders all 4 cards with formatted values', () => {
    render(
      <WorkspaceSummaryCards
        {...BASE}
        totalResponses={254}
        activeForms={4}
        totalForms={6}
        averageResponsesPerForm={63.5}
        completionRate={78.4}
        changes={{ responses: 12.04, average: null, completion: null }}
        perFormResponses={[10, 40, 90, 114]}
        isLoading={false}
      />
    );

    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('254')).toBeInTheDocument();
    expect(screen.getByText('Active Forms')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('/ 6')).toBeInTheDocument();
    expect(screen.getByText('Avg. Responses / Form')).toBeInTheDocument();
    expect(screen.getByText('63.5')).toBeInTheDocument();
    // Sprint 14: the views-based Completion rate card (CompletionRateCard) replaced the old stage-based one.
    expect(screen.getByText('Completion rate')).toBeInTheDocument();
    // The value and the ring's own label both read 78%.
    expect(screen.getAllByText('78%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the change vs the previous period under the card it belongs to', () => {
    render(<WorkspaceSummaryCards {...BASE} totalResponses={254} changes={{ responses: 12.04, average: null, completion: -6 }} isLoading={false} />);

    expect(screen.getByText('↑ 12.0%')).toBeInTheDocument();
    expect(screen.getByText('↓ 6.0%')).toBeInTheDocument();
    expect(screen.getAllByText('vs previous 30 days')).toHaveLength(2);
  });

  it('shows a pulsing skeleton per card while loading', () => {
    const { container } = render(<WorkspaceSummaryCards {...BASE} isLoading />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });

  // The component uses the design-system token (`text-(--text-disabled)`) for a zero/empty value.
  it('renders zero values and an empty completion rate ("—") in muted text-(--text-disabled)', () => {
    render(<WorkspaceSummaryCards {...BASE} isLoading={false} />);

    // Total responses, active forms and the average all read zero.
    expect(screen.getAllByText('0').every((el) => el.className.includes('text-(--text-disabled)'))).toBe(true);
    expect(screen.getByText('0.0').className).toContain('text-(--text-disabled)');
    // The null rate is "—" with a "Not enough views yet" explanation, in the muted token (never 0%).
    expect(screen.getByText('Not enough views yet')).toBeInTheDocument();
    expect(screen.getByText(/^—/).closest('.bg-stat-value')?.className).toContain('text-(--text-disabled)');
  });
});
