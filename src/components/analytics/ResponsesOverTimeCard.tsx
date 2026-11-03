'use client';

import { BarChart3 } from 'lucide-react';
import { BarsChart, ChartCard } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AnalyticsTrendPoint } from '@/types/analytics';
import { parseBucket } from './TrendChart';

export type TrendBucket = 'day' | 'week' | 'month';

/** Daily points added up by calendar month ("2023-04-17" belongs to "2023-04-01"), oldest first. */
export function groupByMonth(points: AnalyticsTrendPoint[]): AnalyticsTrendPoint[] {
  const months = new Map<string, number>();
  for (const p of points) {
    const key = `${p.bucketStart.slice(0, 7)}-01`;
    months.set(key, (months.get(key) ?? 0) + p.responses);
  }
  return [...months].sort(([a], [b]) => a.localeCompare(b)).map(([bucketStart, responses]) => ({ bucketStart, responses }));
}

// Daily bars stop being readable past about half a year, so the Daily choice is offered only while the chart is short.
const DAILY_MAX_POINTS = { week: 26, month: 6 } as const;

/**
 * What a bar is called. In full ("Week of 24 Aug 2020", "5 Oct 2026") for the tooltip and screen readers; on the axis only as much as is
 * needed to tell the bars apart: "24 Aug", or "Aug 2020" once the chart reaches across years (a bare "24 Aug" would not say which year).
 * "Wk" was dropped: it was cut off on the axis ("Wk 1 Fe...") and means nothing to most people.
 */
const names = (bucketStart: string, bucket: TrendBucket, acrossYears: boolean) => {
  const d = parseBucket(bucketStart);
  if (!d) return { label: bucketStart, axisLabel: bucketStart };
  // built from parts because the en-GB locale spells September "Sept"
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const date = `${day} ${month} ${year}`;
  if (bucket === 'month') return { label: `${month} ${year}`, axisLabel: acrossYears ? `${month} ${year}` : month };
  return { label: bucket === 'week' ? `Week of ${date}` : date, axisLabel: acrossYears ? `${month} ${year}` : `${day} ${month}` };
};

interface ResponsesOverTimeCardProps {
  points?: AnalyticsTrendPoint[];
  isLoading: boolean;
  bucket: TrendBucket;
  onBucketChange: (bucket: TrendBucket) => void;
}

// Responses per day/week across all forms as a bar chart (peak highlighted), with a Daily/Weekly
// switch. A visually-hidden table carries the exact figures for assistive tech.
export function ResponsesOverTimeCard({ points, isLoading, bucket, onBucketChange }: ResponsesOverTimeCardProps) {
  const shown = bucket === 'month' && points ? groupByMonth(points) : points;
  const years = new Set((shown ?? []).map((p) => parseBucket(p.bucketStart)?.getUTCFullYear()));
  const showDaily = bucket === 'day' || (shown?.length ?? 0) <= DAILY_MAX_POINTS[bucket];
  const data = (shown ?? []).map((p) => ({ ...names(p.bucketStart, bucket, years.size > 1), value: p.responses }));
  return (
    <ChartCard
      title="Responses over time"
      legend={
        <div className="w-32">
          <Select id="trend-bucket" aria-label="Group responses by" value={bucket} onChange={(e) => onBucketChange(e.target.value as TrendBucket)}>
            {showDaily && <option value="day">Daily</option>}
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-(--bg-sunken)" />
      ) : data.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="No trend yet" description="Responses will chart here once forms start receiving submissions in this range." />
      ) : (
        <>
          <BarsChart data={toSegments(data)} height={210} ariaLabel="Responses over time" />
          <div className="sr-only"><table>
            <caption>Responses per {bucket}</caption>
            <thead>
              <tr><th>Period</th><th>Responses</th></tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={`${d.label}-${i}`}><td>{d.label}</td><td>{d.value}</td></tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </ChartCard>
  );
}
