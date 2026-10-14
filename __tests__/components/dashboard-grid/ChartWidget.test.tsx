import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/components/ui/charts', () => ({
  seriesColor: (i: number) => `color-${i}`,
  ChartCard: ({ title, className, children }: { title: string; className?: string; children: ReactNode }) => (
    <section data-testid="card" data-class={className} aria-label={title}>{children}</section>
  ),
  BarsChart: (p: { data: unknown[]; horizontal?: boolean; byCategory?: boolean; legend?: boolean }) => (
    <div data-testid="bars" data-horizontal={String(!!p.horizontal)} data-bycat={String(!!p.byCategory)} data-legend={String(!!p.legend)} data-n={p.data.length} />
  ),
  LineAreaChart: (p: { area?: boolean; data: unknown[] }) => <div data-testid="line" data-area={String(!!p.area)} data-n={p.data.length} />,
  PieChart: (p: { donut?: boolean }) => <div data-testid="pie" data-donut={String(!!p.donut)} />,
}));

import { CHART_LABEL, ChartWidget } from '@/components/dashboard-grid/ChartWidget';
import type { SegmentMetric, SeriesMetric } from '@/components/dashboard-grid/types';

const series: SeriesMetric = { label: 'Responses', series: [1, 2, 3], labels: ['a', 'b'] };
const segments: SegmentMetric = { label: 'By status', segments: [{ label: 'Published', value: 3 }, { label: 'Draft', value: 1 }] };

describe('ChartWidget', () => {
  it('has a label for every chart kind', () => {
    expect(Object.keys(CHART_LABEL).sort()).toEqual(['area', 'bar', 'donut', 'hbar', 'line', 'pie', 'status']);
  });

  it('shows a no-data message when all values are zero', () => {
    render(<ChartWidget chart="bar" metric={{ label: 'Empty', series: [0, 0] }} />);
    expect(screen.getByText('No data in this range yet')).toBeInTheDocument();
    expect(screen.queryByTestId('bars')).not.toBeInTheDocument();
  });

  it('draws a line or area chart for line/area and uses the title override', () => {
    const { rerender } = render(<ChartWidget chart="line" metric={series} title="Custom" />);
    expect(screen.getByLabelText('Custom')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toHaveAttribute('data-area', 'false');
    expect(screen.getByTestId('line')).toHaveAttribute('data-n', '3');
    rerender(<ChartWidget chart="area" metric={series} />);
    expect(screen.getByTestId('line')).toHaveAttribute('data-area', 'true');
    expect(screen.getByLabelText('Responses')).toBeInTheDocument();
  });

  it('draws donut vs pie', () => {
    const { rerender } = render(<ChartWidget chart="donut" metric={segments} />);
    expect(screen.getByTestId('pie')).toHaveAttribute('data-donut', 'true');
    rerender(<ChartWidget chart="pie" metric={segments} />);
    expect(screen.getByTestId('pie')).toHaveAttribute('data-donut', 'false');
  });

  it('draws horizontal bars, with the card filling its grid cell even for few rows (no empty frame under it)', () => {
    render(<ChartWidget chart="hbar" metric={segments} />);
    expect(screen.getByTestId('bars')).toHaveAttribute('data-horizontal', 'true');
    expect(screen.getByTestId('card')).toHaveAttribute('data-class', 'h-full');
  });

  it('shows no legend for a lone bar (it would only repeat the bar\'s own label)', () => {
    const one: SegmentMetric = { label: 'One', segments: [{ label: 'Test', value: 2 }] };
    render(<ChartWidget chart="hbar" metric={one} />);
    expect(screen.getByTestId('bars')).not.toHaveAttribute('data-legend', 'true');
  });

  it('stretches the hbar card when there are more than three rows', () => {
    const many: SegmentMetric = { label: 'Many', segments: [1, 2, 3, 4].map((n) => ({ label: `S${n}`, value: n })) };
    render(<ChartWidget chart="hbar" metric={many} />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-class', 'h-full');
  });

  it('draws the status bar with totals and percentages', () => {
    render(<ChartWidget chart="status" metric={segments} />);
    expect(screen.getByRole('img', { name: 'By status' })).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('(75%)')).toBeInTheDocument();
    expect(screen.getByText('(25%)')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('draws plain bars for a series and category bars with a legend for segments', () => {
    const { rerender } = render(<ChartWidget chart="bar" metric={series} />);
    expect(screen.getByTestId('bars')).toHaveAttribute('data-bycat', 'false');
    expect(screen.getByTestId('bars')).toHaveAttribute('data-legend', 'false');
    rerender(<ChartWidget chart="bar" metric={segments} />);
    expect(screen.getByTestId('bars')).toHaveAttribute('data-bycat', 'true');
    expect(screen.getByTestId('bars')).toHaveAttribute('data-legend', 'true');
  });
});
