import type { KpiData, KpiVariant } from '@/components/ui/KpiCard';

// A dashboard is an ordered flow of widgets on a 12-column grid. `w` is the width in columns.
export const WIDTHS = [3, 4, 6] as const;
export type WidgetWidth = (typeof WIDTHS)[number];

/** The chart looks the Insights pages already use. */
export type ChartKind = 'bar' | 'line' | 'area' | 'hbar' | 'donut' | 'pie' | 'status';

// Widgets name WHAT to show; they never carry a query. Data is resolved by the host page.
export type WidgetConfig =
  | { type: 'kpi'; variant: KpiVariant; metric: string; title?: string }
  | { type: 'chart'; chart: ChartKind; metric: string; title?: string };

export interface Widget {
  id: string;
  w: WidgetWidth;
  config: WidgetConfig;
}

/** Values over time (oldest first), optionally with an x-axis label per point. */
export interface SeriesMetric { label: string; series: number[]; labels?: string[] }
/** Values per category (form status, answer option, ...). */
export interface SegmentMetric { label: string; segments: { label: string; value: number }[] }

/** Resolved data for the metrics a dashboard can show. Missing key = "unavailable". */
export type MetricMap = Record<string, KpiData | SeriesMetric | SegmentMetric | undefined>;

export const isSeries = (m: unknown): m is SeriesMetric => !!m && typeof m === 'object' && 'series' in m;
export const isSegments = (m: unknown): m is SegmentMetric => !!m && typeof m === 'object' && 'segments' in m;
export const isKpi = (m: unknown): m is KpiData => !!m && !isSeries(m) && !isSegments(m);

/** Chart looks that make sense for a given dataset. */
export const chartsFor = (m: SeriesMetric | SegmentMetric): ChartKind[] =>
  isSeries(m) ? ['bar', 'line', 'area'] : ['donut', 'pie', 'hbar', 'bar', 'status'];
