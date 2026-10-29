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

  it('renders exactly 3 segments with the status-dot design-token colors, in a donut that has the total in its centre', () => {
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
    expect(screen.getByRole('img').textContent).toContain('128'); // the total, in the middle
  });

  it('comma-formats large counts, in the legend and in the middle of the donut', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 1284, categoryCounts: { new: 184, in_progress: 326, completed: 774 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    expect(screen.getAllByText('774').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /774 completed/ })).toBeInTheDocument();
    expect(screen.getByRole('img').textContent).toContain('1,284');
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

    const table = document.querySelector('.sr-only table') as HTMLTableElement;
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

  // With the form's own stages the card is its pipeline: every stage is a row, in order, whether or not anyone is in it yet.
  describe('with the stages of the form', () => {
    const stage = (id: string, name: string, category: 'new' | 'in_progress' | 'completed') => ({ id, name, colour: 'neutral' as const, category });
    const PIPELINE = [stage('s-new', 'New', 'new'), stage('s-review', 'In Review', 'in_progress'), stage('s-hold', 'On Hold', 'in_progress'), stage('s-done', 'Released', 'completed')];
    const counts = [
      { stageId: 's-done', name: 'Released', category: 'completed' as const, count: 422 },
      { stageId: 's-new', name: 'New', category: 'new' as const, count: 267 },
      { stageId: 's-review', name: 'In Review', category: 'in_progress' as const, count: 481 },
    ];
    const labelsOf = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);

    it('lists every stage in the order of the pipeline, and a stage with nobody in it shows 0', () => {
      const overview = mockAnalyticsOverview({ totalResponses: 1170, categoryCounts: { new: 267, in_progress: 481, completed: 422 }, stageCounts: counts });
      render(<StatusDistributionChart overview={overview} isLoading={false} stages={PIPELINE} />);
      expect(labelsOf()).toEqual(['New', 'In Review', 'On Hold', 'Released']);
      const hold = screen.getAllByRole('row').find((r) => r.querySelector('td')?.textContent === 'On Hold')!;
      expect(hold.textContent).toContain('0');
      expect(hold.textContent).toContain('0.0%');
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('0 on hold'));
    });

    it('keeps the responses of a stage that is no longer on the list, so the rows still add up', () => {
      const gone = [...counts, { stageId: 's-old', name: 'Archived', category: 'completed' as const, count: 5 }];
      const overview = mockAnalyticsOverview({ totalResponses: 1175, categoryCounts: { new: 267, in_progress: 481, completed: 427 }, stageCounts: gone });
      render(<StatusDistributionChart overview={overview} isLoading={false} stages={PIPELINE} />);
      expect(labelsOf()).toEqual(['New', 'In Review', 'On Hold', 'Released', 'Archived']);
    });

    it('a long list scrolls inside the card (reachable with the keyboard) instead of making the card taller than the chart beside it', () => {
      const many = Array.from({ length: 9 }, (_, i) => stage(`s${i}`, `Stage ${i + 1}`, 'in_progress'));
      const overview = mockAnalyticsOverview({ totalResponses: 90, categoryCounts: { new: 0, in_progress: 90, completed: 0 }, stageCounts: many.map((m) => ({ stageId: m.id, name: m.name, category: m.category, count: 10 })) });
      render(<StatusDistributionChart overview={overview} isLoading={false} stages={many} />);
      const list = screen.getByRole('region', { name: 'Responses in each stage' });
      expect(list).toHaveAttribute('tabindex', '0');
      expect(list.className).toContain('overflow-y-auto');
    });

    it('a short list does not scroll, and is not an extra stop for the keyboard', () => {
      const overview = mockAnalyticsOverview({ totalResponses: 1170, categoryCounts: { new: 267, in_progress: 481, completed: 422 }, stageCounts: counts });
      render(<StatusDistributionChart overview={overview} isLoading={false} stages={PIPELINE} />);
      expect(screen.queryByRole('region', { name: 'Responses in each stage' })).not.toBeInTheDocument();
    });
  });
});
