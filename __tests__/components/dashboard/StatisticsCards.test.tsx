/**
 * __tests__/components/dashboard/StatisticsCards.test.tsx
 * Migrated onto ui/StatCard (see the component's own comment) — updated to test the new
 * behavior rather than leave old implementation-detail assertions red, matching the precedent
 * set migrating Button/Input in sprint-7-foundation (tasks.md 2.1/2.2). The old muted-zero-value
 * color (bugs-25jul.md's I-12 fix) was a V1-specific nuance StatCard doesn't carry forward —
 * dropped, not silently broken.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatisticsCards } from '@/components/dashboard/StatisticsCards';

describe('StatisticsCards component', () => {
  it('renders all 4 stat cards with their labels', () => {
    render(<StatisticsCards />);
    expect(screen.getByText('Total Forms')).toBeInTheDocument();
    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('Published Forms')).toBeInTheDocument();
    expect(screen.getByText('Responses This Month')).toBeInTheDocument();
  });

  it('renders the provided counts', () => {
    render(
      <StatisticsCards
        counts={{ totalForms: 5, totalResponses: 42, publishedForms: 3, responsesThisMonth: 7 }}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders a loading skeleton instead of values when isLoading', () => {
    render(<StatisticsCards isLoading />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.bg-skeleton').length).toBe(4);
  });

  it('renders every value inside a StatCard, including zero', () => {
    render(<StatisticsCards counts={{ totalForms: 0, totalResponses: 1, publishedForms: 0, responsesThisMonth: 0 }} />);
    const zeroValue = screen.getAllByText('0')[0];
    expect(zeroValue.className).toContain('bg-stat-value');
  });
});
