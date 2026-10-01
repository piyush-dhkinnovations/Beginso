/**
 * __tests__/components/analytics/StatusDistributionChart.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: StatusDistributionChart — segment colors/counts, center total, empty state, legend,
 * sr-only table
 * Requirements: 5.1-5.5, 13.1, 13.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StatusDistributionChart } from '@/components/analytics/StatusDistributionChart';
import { mockAnalyticsOverview } from '@/lib/mocks/analyticsMocks';

describe('StatusDistributionChart', () => {
  it('shows a pulsing skeleton block while loading', () => {
    const { container } = render(<StatusDistributionChart isLoading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders an inline error card with retry', () => {
    const onRetry = vi.fn();
    render(<StatusDistributionChart isLoading={false} isError onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render the donut when total responses is 0 — renders the shared empty state instead', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 0, categoryCounts: { new: 0, in_progress: 0, completed: 0 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} isAllTime />);

    expect(screen.getByText('No responses yet')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders exactly 3 segments with the status-dot design-token colors, and the center total', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 128, categoryCounts: { new: 42, in_progress: 36, completed: 50 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    // Legend rows carry the three category counts; each dot uses a design-token colour.
    const dots = Array.from(document.querySelectorAll('span[aria-hidden="true"].rounded-full')) as HTMLElement[];
    expect(dots.map((d) => d.style.backgroundColor)).toEqual([
      'var(--action-primary)',
      'var(--warning)',
      'var(--success)',
    ]);
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);
    expect(screen.getAllByText('36').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50').length).toBeGreaterThan(0);

    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('comma-formats a large center total (e.g. "1,284")', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 1284, categoryCounts: { new: 184, in_progress: 326, completed: 774 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    expect(screen.getByText('1,284')).toBeInTheDocument();
  });

  it('renders a legend with status name, count, and percentage, plus a matching sr-only table', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 10, categoryCounts: { new: 5, in_progress: 3, completed: 2 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    // Each percentage appears twice: once in the visible legend, once in the sr-only table.
    expect(screen.getAllByText('50.0%').length).toBeGreaterThan(0); // New: 5/10
    expect(screen.getAllByText('30.0%').length).toBeGreaterThan(0); // In Progress: 3/10
    expect(screen.getAllByText('20.0%').length).toBeGreaterThan(0); // Completed: 2/10

    const table = document.querySelector('table.sr-only') as HTMLTableElement;
    expect(table.textContent).toContain('New');
    expect(table.textContent).toContain('5');
    expect(table.textContent).toContain('50.0%');
  });
});
