'use client';

import { PieChart as PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { getBaseChartOption, CHART_COLORS, type EChartsOption } from '@/lib/chartTheme';
import { STATUS_LABELS, type ResponseStatus } from '@/types/response';
import type { AnalyticsOverview } from '@/types/analytics';

const CHART_HEIGHT = 240;

const SEGMENT_ORDER: ResponseStatus[] = ['new', 'in_progress', 'completed'];

const SEGMENT_COLORS: Record<ResponseStatus, string> = {
  new: CHART_COLORS.statusNew,
  in_progress: CHART_COLORS.statusProgress,
  completed: CHART_COLORS.statusCompleted,
};

function buildDonutOption(statusCounts: AnalyticsOverview['statusCounts']): EChartsOption {
  const base = getBaseChartOption();
  return {
    ...base,
    tooltip: { ...base.tooltip, trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: SEGMENT_ORDER.map((status) => ({
          name: STATUS_LABELS[status],
          value: statusCounts[status],
          itemStyle: { color: SEGMENT_COLORS[status] },
        })),
      },
    ],
  };
}

interface StatusDistributionChartProps {
  overview?: AnalyticsOverview;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Whether the current Date_Range is "All time" — changes the empty-state copy, matching
   * TrendChart (Requirement 4.4, reused per 5.4 — one shared empty state, one shared cause). */
  isAllTime?: boolean;
}

export function StatusDistributionChart({ overview, isLoading, isError = false, onRetry, isAllTime = false }: StatusDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse rounded bg-neutral-100" style={{ height: CHART_HEIGHT }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4">
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">Unable to load the status split</p>
          <p className="mt-1 text-caption text-neutral-500">The rest of the dashboard is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const total = overview?.totalResponses ?? 0;

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={<PieChartIcon />}
          heading={isAllTime ? 'No responses yet' : 'No responses in this range'}
          body={
            isAllTime
              ? 'Responses will appear here once this form starts receiving submissions.'
              : 'Try a wider date range to see responses outside this window.'
          }
        />
      </Card>
    );
  }

  const statusCounts = overview?.statusCounts ?? { new: 0, in_progress: 0, completed: 0 };
  const percentOf = (count: number) => (total > 0 ? ((count / total) * 100).toFixed(1) : '0.0');

  return (
    <Card>
      <h3 className="text-heading-2 text-neutral-900 font-bold mb-4">Status Distribution</h3>
      <div className="flex flex-col items-center gap-6">
        <div className="relative shrink-0" style={{ height: CHART_HEIGHT, width: CHART_HEIGHT }}>
          <EChartContainer option={buildDonutOption(statusCounts)} height={CHART_HEIGHT} ariaLabel="Response status distribution" />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-display font-bold text-neutral-900">{total.toLocaleString()}</span>
            <span className="text-caption text-neutral-500">Total</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          {SEGMENT_ORDER.map((status) => (
            <div key={status} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEGMENT_COLORS[status] }} />
                <span className="text-body-sm font-medium text-neutral-700">{STATUS_LABELS[status]}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-body-sm font-semibold text-neutral-900">{statusCounts[status].toLocaleString()}</span>
                <span className="text-caption text-neutral-500 w-12 text-right">{percentOf(statusCounts[status])}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Response status distribution</caption>
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {SEGMENT_ORDER.map((status) => (
            <tr key={status}>
              <td>{STATUS_LABELS[status]}</td>
              <td>{statusCounts[status]}</td>
              <td>{percentOf(statusCounts[status])}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
