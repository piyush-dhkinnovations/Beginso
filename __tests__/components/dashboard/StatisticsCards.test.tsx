/**
 * __tests__/components/dashboard/StatisticsCards.test.tsx
 * Audit remediation: zero test coverage. Tests: renders all 4 cards with
 * provided counts, loading skeleton, and the muted-vs-solid zero-value color
 * (bugs-25jul.md's I-12 fix — neutral-400, not neutral-500).
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
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('mutes a zero-value stat with text-neutral-400', () => {
    render(<StatisticsCards counts={{ totalForms: 0, totalResponses: 1, publishedForms: 0, responsesThisMonth: 0 }} />);
    const zeroValue = screen.getAllByText('0')[0];
    expect(zeroValue.className).toContain('text-neutral-400');
  });

  it('does not mute a non-zero value', () => {
    render(<StatisticsCards counts={{ totalForms: 5, totalResponses: 1, publishedForms: 0, responsesThisMonth: 0 }} />);
    const nonZeroValue = screen.getByText('5');
    expect(nonZeroValue.className).toContain('text-neutral-900');
  });
});
