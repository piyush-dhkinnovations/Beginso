/**
 * __tests__/components/analytics/StatusDistributionChart.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: StatusDistributionChart — segment colors/counts, center total, empty state, legend,
 * sr-only table
 * Requirements: 5.1-5.5, 13.1, 13.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/charts/EChartContainer', () => ({
  EChartContainer: ({ option, ariaLabel }: { option: unknown; ariaLabel: string }) => (
    <div role="img" aria-label={ariaLabel} data-option={JSON.stringify(option)} />
  ),
}));

import { StatusDistributionChart } from '@/components/analytics/StatusDistributionChart';
import { mockAnalyticsOverview } from '@/lib/mocks/analyticsMocks';
import { CHART_COLORS } from '@/lib/chartTheme';

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
    const overview = mockAnalyticsOverview({ totalResponses: 0, statusCounts: { new: 0, in_progress: 0, completed: 0 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} isAllTime />);

    expect(screen.getByText('No responses yet')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders exactly 3 segments with the status-dot design-token colors, and the center total', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 128, statusCounts: { new: 42, in_progress: 36, completed: 50 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    const chart = screen.getByRole('img', { name: 'Response status distribution' });
    const option = JSON.parse(chart.getAttribute('data-option') as string);
    const segments = option.series[0].data;
    expect(segments).toHaveLength(3);
    expect(segments.map((s: { itemStyle: { color: string } }) => s.itemStyle.color)).toEqual([
      CHART_COLORS.statusNew,
      CHART_COLORS.statusProgress,
      CHART_COLORS.statusCompleted,
    ]);
    expect(segments.map((s: { value: number }) => s.value)).toEqual([42, 36, 50]);

    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('renders a Badge-based legend and a matching sr-only table, both carrying the status name as text', () => {
    const overview = mockAnalyticsOverview({ totalResponses: 10, statusCounts: { new: 5, in_progress: 3, completed: 2 } });
    render(<StatusDistributionChart overview={overview} isLoading={false} />);

    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);

    const table = document.querySelector('table.sr-only') as HTMLTableElement;
    expect(table.textContent).toContain('New');
    expect(table.textContent).toContain('5');
  });
});
