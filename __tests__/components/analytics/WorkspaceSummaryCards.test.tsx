/**
 * __tests__/components/analytics/WorkspaceSummaryCards.test.tsx
 * Tests: WorkspaceSummaryCards — 4-card grid, skeleton, zero/dash-muted values
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceSummaryCards } from '@/components/analytics/WorkspaceSummaryCards';

describe('WorkspaceSummaryCards', () => {
  it('renders all 4 cards with formatted values', () => {
    render(
      <WorkspaceSummaryCards
        totalResponses={254}
        activeForms={4}
        averageResponsesPerForm={63.5}
        changePercent={12.04}
        isLoading={false}
      />
    );

    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('254')).toBeInTheDocument();
    expect(screen.getByText('Active Forms')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Avg. Responses / Form')).toBeInTheDocument();
    expect(screen.getByText('63.5')).toBeInTheDocument();
    expect(screen.getByText('Change vs Previous Period')).toBeInTheDocument();
    expect(screen.getByText('↑ 12.0%')).toBeInTheDocument();
  });

  it('shows a pulsing skeleton per card while loading', () => {
    const { container } = render(
      <WorkspaceSummaryCards totalResponses={0} activeForms={0} averageResponsesPerForm={0} changePercent={null} isLoading />
    );
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });

  // Bug fix: the component already uses the real design-system token (`text-(--text-disabled)`,
  // part of this sprint's colour-token cleanup) for a zero/null muted value — this assertion
  // still looked for the old raw Tailwind class `text-neutral-400`, which no longer exists here.
  it('renders a zero total and a null change ("—") in muted text-(--text-disabled)', () => {
    render(
      <WorkspaceSummaryCards totalResponses={0} activeForms={0} averageResponsesPerForm={0} changePercent={null} isLoading={false} />
    );

    expect(screen.getAllByText('0').every((el) => el.className.includes('text-(--text-disabled)'))).toBe(true);
    const dash = screen.getByText('—');
    expect(dash.className).toContain('text-(--text-disabled)');
  });
});
