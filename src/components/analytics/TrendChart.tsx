'use client';

import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { getBaseChartOption, CHART_COLORS, type EChartsOption } from '@/lib/chartTheme';
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

function formatBucketLabel(bucketStart: string, bucket: 'day' | 'week'): string {
  const label = new Date(bucketStart).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return bucket === 'week' ? `Wk of ${label}` : label;
}

function buildTrendOption(result: AnalyticsTrendResult, points: AnalyticsTrendPoint[]): EChartsOption {
  const base = getBaseChartOption();
  return {
    ...base,
    grid: { left: 40, right: 16, top: 16, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: points.map((p) => formatBucketLabel(p.bucketStart, result.bucket)),
    },
    yAxis: { type: 'value', minInterval: 1 },
    tooltip: { ...base.tooltip, trigger: 'axis' },
    series: [
      {
        type: 'line',
        data: points.map((p) => p.responses),
        color: CHART_COLORS.brand,
        smooth: true,
        areaStyle: { color: CHART_COLORS.brandLight },
      },
    ],
  };
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
      <EChartContainer option={buildTrendOption(data as AnalyticsTrendResult, mapped)} height={CHART_HEIGHT} ariaLabel="Response trend over time" />
      <table className="sr-only">
        <caption>Responses per {data?.bucket === 'week' ? 'week' : 'day'}</caption>
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
