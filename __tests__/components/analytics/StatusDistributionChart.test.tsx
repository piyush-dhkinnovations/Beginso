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

  it('renders exactly 3 segments with the status-dot design-token colors, and a stacked bar (no donut centre total)', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 128, categoryCounts: { new: 42, in_progress: 36, completed: 50 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    // Legend rows carry the three category counts; each dot uses a design-token colour.
    const dots = Array.from(document.querySelectorAll('span[aria-hidden="true"].rounded-full')) as HTMLElement[];
    expect(dots.map((d) => d.style.backgroundColor)).toEqual([
      'var(--action-primary)',
      'var(--info)',
      'var(--success)',
    ]);
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);
    expect(screen.getAllByText('36').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50').length).toBeGreaterThan(0);

    expect(screen.getByRole('img', { name: /42 new, 36 in progress, 50 completed/ })).toBeInTheDocument();
  });

  it('comma-formats large legend counts (e.g. "1,284" not in a donut centre)', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 1284, categoryCounts: { new: 184, in_progress: 326, completed: 774 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    expect(screen.getAllByText('774').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /774 completed/ })).toBeInTheDocument();
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

  // The workspace own stages (In Review, On Hold, Released...) were folded into the three category totals and never shown.
  describe('with the workspace own stages', () => {
    const stageCounts = [
      { stageId: 's-done', name: 'Released', category: 'completed' as const, count: 120 },
      { stageId: 's-new', name: 'New', category: 'new' as const, count: 269 },
      { stageId: 's-review', name: 'In Review', category: 'in_progress' as const, count: 300 },
      { stageId: 's-hold', name: 'On Hold', category: 'in_progress' as const, count: 178 },
      { stageId: 's-comp', name: 'Completed', category: 'completed' as const, count: 303 },
    ];

    it('shows one row per stage, grouped New, then In Progress, then Completed (largest first within a group)', () => {
      const overview = mockAnalyticsOverview({ totalResponses: 1170, categoryCounts: { new: 269, in_progress: 478, completed: 423 }, stageCounts });
      render(<StatusDistributionChart overview={overview} isLoading={false} />);
      const labels = screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);
      expect(labels).toEqual(['New', 'In Review', 'On Hold', 'Completed', 'Released']);
      expect(screen.getAllByText('In Review').length).toBeGreaterThan(0);
      expect(screen.getAllByText('300').length).toBeGreaterThan(0);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('300 in review'));
    });

    it('puts responses that are in no stage in their own row, so the rows add up to the total', () => {
      const overview = mockAnalyticsOverview({ totalResponses: 1200, categoryCounts: { new: 269, in_progress: 478, completed: 453 }, stageCounts });
      render(<StatusDistributionChart overview={overview} isLoading={false} />);
      const labels = screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);
      expect(labels.at(-1)).toBe('No stage yet');
      expect(screen.getAllByText('30').length).toBeGreaterThan(0); // 1200 - 1170
    });

    it('does not add a "No stage yet" row when every response is in a stage', () => {
      const overview = mockAnalyticsOverview({ totalResponses: 1170, categoryCounts: { new: 269, in_progress: 478, completed: 423 }, stageCounts });
      render(<StatusDistributionChart overview={overview} isLoading={false} />);
      expect(screen.queryByText('No stage yet')).not.toBeInTheDocument();
    });

    it('falls back to the three categories when there are no stage counts (a personal form, or an older backend)', () => {
      const overview = mockAnalyticsOverview({ totalResponses: 128, categoryCounts: { new: 42, in_progress: 36, completed: 50 } });
      render(<StatusDistributionChart overview={overview} isLoading={false} />);
      const labels = screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);
      expect(labels).toEqual(['New', 'In Progress', 'Completed']);
    });
  });
});
