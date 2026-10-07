'use client';

import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LineAreaChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import type { AnalyticsTrendPoint, AnalyticsTrendResult } from '@/types/analytics';

const CHART_HEIGHT = 280;

/** Pure data-transform the trend chart renders from — Correctness Property 2 (Friday) verifies
 * it preserves length/order and never emits a NaN or negative response count. */
export function mapTrendSeries(points: AnalyticsTrendPoint[]): AnalyticsTrendPoint[] {
  return points.map((p) => ({
    bucketStart: p.bucketStart,
    responses: Number.isFinite(p.responses) && p.responses >= 0 ? p.responses : 0,
  }));
}

// The backend's bucket keys are plain strings, not ISO timestamps: days are "2026-04-06" and weeks are
// ISO weeks "2026-W15" (`new Date("2026-W15")` is Invalid Date). A week is labelled by its Monday.
function parseBucket(bucketStart: string): Date | null {
  const week = /^(\d{4})-W(\d{2})$/.exec(bucketStart);
  if (week) {
    const jan4 = new Date(Date.UTC(Number(week[1]), 0, 4));
    const monday = Date.UTC(Number(week[1]), 0, 4 - ((jan4.getUTCDay() + 6) % 7));
    return new Date(monday + (Number(week[2]) - 1) * 7 * 86_400_000);
  }
  const d = new Date(bucketStart);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatBucketLabel(bucketStart: string, _bucket: 'day' | 'week'): string {
  const d = parseBucket(bucketStart);
  if (!d) return bucketStart;
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  // Chart axis labels stay short ("6 Apr") so they never collide; the week is spelled out for screen readers.
  return label;
}

interface TrendChartProps {
  data?: AnalyticsTrendResult;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Whether the current Date_Range is "All time" — changes the empty-state copy between "no
   * responses ever" and "none in this narrower window" (Requirement 4.4). */
  isAllTime?: boolean;
}

export function TrendChart({ data, isLoading, isError = false, onRetry, isAllTime = false }: TrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse rounded bg-(--bg-sunken)" style={{ height: CHART_HEIGHT }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4">
        <div>
          <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load the response trend</p>
          <p className="mt-1 bg-caption text-(--text-muted)">The rest of the dashboard is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const points = data?.points ?? [];

  if (points.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<TrendingUp />}
          title={isAllTime ? 'No responses yet' : 'No responses in this range'}
          description={
            isAllTime
              ? 'Responses will appear here once this form starts receiving submissions.'
              : 'Try a wider date range to see responses outside this window.'
          }
        />
      </Card>
    );
  }

  const mapped = mapTrendSeries(points);

  return (
    <Card>
      <h3 className="bg-h5 text-(--text-primary) font-bold mb-4">Response Trend</h3>
      <LineAreaChart
        area
        data={toSegments(mapped.map((p) => ({ key: p.bucketStart, label: formatBucketLabel(p.bucketStart, data?.bucket ?? 'day'), value: p.responses })))}
        height={CHART_HEIGHT}
        ariaLabel="Response trend over time"
      />
      <table className="sr-only">
        <caption>Responses per {data?.bucket === 'week' ? 'week (labelled by the Monday it starts)' : 'day'}</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Responses</th>
          </tr>
        </thead>
        <tbody>
          {mapped.map((p) => (
            <tr key={p.bucketStart}>
              <td>{formatBucketLabel(p.bucketStart, data?.bucket ?? 'day')}</td>
              <td>{p.responses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
