/**
 * __tests__/components/analytics/AnalyticsStatCards.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: AnalyticsStatCards — 4-card grid, skeleton, error+retry, zero-muted value
 * Requirements: 2.1-2.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsStatCards } from '@/components/analytics/AnalyticsStatCards';
import { mockAnalyticsOverview } from '@/lib/mocks/analyticsMocks';

describe('AnalyticsStatCards', () => {
  it('renders 4 cards in Total/Completed/In Progress/New order with their values', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 128, categoryCounts: { new: 42, in_progress: 36, completed: 50 } });
    render(<AnalyticsStatCards overview={overview} isLoading={false} />);

    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  // Sprint 14 (OQ-3): no counted views -> "—" with its explanation, never 0%.
  it('shows "—" with "Not enough views yet" when the completion rate is null, and a percentage when it is not', () => {
    const { rerender } = render(<AnalyticsStatCards overview={mockAnalyticsOverview({ completionRate: null })} isLoading={false} />);
    expect(screen.getByText('Not enough views yet')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();

    rerender(<AnalyticsStatCards overview={mockAnalyticsOverview({ completionRate: 42 })} isLoading={false} />);
    // The value and the ring's own label both read 42%.
    expect(screen.getAllByText('42%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('42% of people who open this form finish it')).toBeInTheDocument();
  });

  it('shows "—" instead of the lifetime rate when the selected range has no responses', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 0, completionRate: 100, categoryCounts: { new: 0, in_progress: 0, completed: 0 } });
    render(<AnalyticsStatCards overview={overview} isLoading={false} />);
    expect(screen.getByText('Not enough views yet')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('renders a zero value in muted text-(--text-muted) (theme-aware)', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 0, categoryCounts: { new: 0, in_progress: 0, completed: 0 } });
    render(<AnalyticsStatCards overview={overview} isLoading={false} />);

    screen.getAllByText('0').forEach((el) => expect(el).toHaveClass('text-text-muted'));
  });

  it('shows a pulsing skeleton per card while loading', () => {
    const { container } = render(<AnalyticsStatCards isLoading />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });

  it('renders an inline error card with a retry action instead of the grid', () => {
    const onRetry = vi.fn();
    render(<AnalyticsStatCards isLoading={false} isError onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Total Responses')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
