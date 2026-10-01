'use client';

import { PieChart as PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CHART_COLOR, Donut } from '@/components/ui/charts';
import { CATEGORY_LABELS, type StageCategory } from '@/types/stage';
import type { AnalyticsOverview } from '@/types/analytics';

const CHART_HEIGHT = 240;
const DONUT_SIZE = 168;

// Sprint 12 (inbox-collaboration), requirements.md §7.3 #3, design.md §2/§23 (OQ-11 default):
// grouped by stage `category`, not the removed fixed `status` union — the three category buckets
// (`CATEGORY_LABELS`) are structural (the backend's own fixed enum), not a workspace-defined stage
// name, so a literal label here is not the banned "hardcoded status label" requirements.md §7.1
// forbids; a workspace with five custom stages still yields a coherent three-bucket donut.
const SEGMENT_ORDER: StageCategory[] = ['new', 'in_progress', 'completed'];

const SEGMENT_COLORS: Record<StageCategory, string> = {
  new: CHART_COLOR.primary,
  in_progress: CHART_COLOR.warning,
  completed: CHART_COLOR.success,
};

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
        <div className="animate-pulse rounded bg-(--bg-sunken)" style={{ height: CHART_HEIGHT }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4">
        <div>
          <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load the status split</p>
          <p className="mt-1 bg-caption text-(--text-muted)">The rest of the dashboard is still available.</p>
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

  const categoryCounts = overview?.categoryCounts ?? { new: 0, in_progress: 0, completed: 0 };
  const percentOf = (count: number) => (total > 0 ? ((count / total) * 100).toFixed(1) : '0.0');

  return (
    <Card>
      <h3 className="bg-h5 text-(--text-primary) font-bold mb-4">Status Distribution</h3>
      <div className="flex flex-col items-center gap-6">
        <Donut
          size={DONUT_SIZE}
          centre={total.toLocaleString()}
          sub="Total"
          segments={SEGMENT_ORDER.map((category) => ({
            label: CATEGORY_LABELS[category],
            value: categoryCounts[category],
            color: SEGMENT_COLORS[category],
          }))}
        />

        <div className="flex flex-col gap-2.5 w-full">
          {SEGMENT_ORDER.map((category) => (
            <div key={category} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEGMENT_COLORS[category] }} />
                <span className="bg-body-sm font-medium text-(--text-secondary)">{CATEGORY_LABELS[category]}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="bg-body-sm font-semibold text-(--text-primary)">{categoryCounts[category].toLocaleString()}</span>
                <span className="bg-caption text-(--text-muted) w-12 text-right">{percentOf(categoryCounts[category])}%</span>
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
          {SEGMENT_ORDER.map((category) => (
            <tr key={category}>
              <td>{CATEGORY_LABELS[category]}</td>
              <td>{categoryCounts[category]}</td>
              <td>{percentOf(categoryCounts[category])}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
