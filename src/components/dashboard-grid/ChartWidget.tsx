'use client';

import { BarChart3 } from 'lucide-react';
import { BarsChart, ChartCard, LineAreaChart, PieChart, seriesColor } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import { isSeries, type ChartKind, type SegmentMetric, type SeriesMetric } from './types';

export const CHART_LABEL: Record<ChartKind, string> = {
  bar: 'Bar chart', line: 'Line chart', area: 'Area chart', hbar: 'Horizontal bars', donut: 'Donut', pie: 'Pie', status: 'Status bar',
};

// The same chart components the Insights pages use, fed from a dashboard metric.
export function ChartWidget({ chart, metric, title }: { chart: ChartKind; metric: SeriesMetric | SegmentMetric; title?: string }) {
  const rows = isSeries(metric)
    ? metric.series.map((value, i) => ({ label: metric.labels?.[i] ?? String(i + 1), value }))
    : metric.segments;
  const data = toSegments(rows);
  const label = title ?? metric.label;
  const total = rows.reduce((s, r) => s + r.value, 0);

  // Nothing to plot: a compact message, and the card sizes to it instead of stretching to the row.
  if (total === 0) {
    return (
      <ChartCard title={label} className="h-auto!">
        <p className="flex items-center gap-2 bg-body-sm text-(--text-muted)"><BarChart3 className="size-4 flex-none" aria-hidden="true" />No data in this range yet</p>
      </ChartCard>
    );
  }

  let body;
  if (chart === 'line' || chart === 'area') body = <LineAreaChart data={data} ariaLabel={label} area={chart === 'area'} />;
  else if (chart === 'donut' || chart === 'pie') body = <PieChart data={data} ariaLabel={label} donut={chart === 'donut'} centreLabel="total" />;
  else if (chart === 'hbar') body = <BarsChart data={data} ariaLabel={label} horizontal byCategory legend />;
  else if (chart === 'status') {
    body = (
      <div className="flex flex-col gap-4">
        <p className="bg-body-sm text-(--text-muted)"><span className="text-2xl font-bold tabular-nums text-(--text-primary)">{total}</span> total</p>
        <div role="img" aria-label={label} className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
          {rows.map((s, i) => (s.value > 0 ? <span key={s.label} style={{ flexGrow: s.value, backgroundColor: seriesColor(i) }} /> : null))}
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-3 bg-body-sm text-(--text-secondary)">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: seriesColor(i) }} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="font-semibold tabular-nums text-(--text-primary)">
                {s.value} <span className="font-normal text-(--text-muted)">({total ? Math.round((s.value / total) * 100) : 0}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else body = <BarsChart data={data} ariaLabel={label} byCategory={!isSeries(metric)} legend={!isSeries(metric)} />;

  return <ChartCard title={label} className={chart === 'hbar' && rows.length <= 3 ? 'h-auto!' : 'h-full'}>{body}</ChartCard>;
}
