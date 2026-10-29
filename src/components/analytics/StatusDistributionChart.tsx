'use client';

import { PieChart as PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Donut } from '@/components/ui/charts/Rings';
import { seriesColor } from '@/components/ui/charts';
import { bx } from '@/lib/utils';
import { CATEGORY_LABELS, type StageCategory, type StageRef } from '@/types/stage';
import type { AnalyticsOverview } from '@/types/analytics';

const CHART_HEIGHT = 240;

// Sprint 12 (inbox-collaboration), requirements.md §7.3 #3, design.md §2/§23 (OQ-11 default):
// grouped by stage `category`, not the removed fixed `status` union — the three category buckets
// (`CATEGORY_LABELS`) are structural (the backend's own fixed enum), not a workspace-defined stage
// name, so a literal label here is not the banned "hardcoded status label" requirements.md §7.1
// forbids; a workspace with five custom stages still yields a coherent three-bucket donut.
const SEGMENT_ORDER: StageCategory[] = ['new', 'in_progress', 'completed'];

interface StatusDistributionChartProps {
  overview?: AnalyticsOverview;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Whether the current Date_Range is "All time" — changes the empty-state copy, matching
   * TrendChart (Requirement 4.4, reused per 5.4 — one shared empty state, one shared cause). */
  isAllTime?: boolean;
  /** Every stage this form can use, in the order of its pipeline. With these the card lists all of them, a stage nobody is in yet included (at 0). */
  stages?: readonly StageRef[];
}

/** More rows than this scroll inside the card instead of making it taller than the chart beside it. */
const VISIBLE_ROWS = 6;

export function StatusDistributionChart({ overview, isLoading, isError = false, onRetry, isAllTime = false, stages }: StatusDistributionChartProps) {
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

  // One row per workspace stage when the backend sends stage counts (a workspace with In Review, On Hold, Released... used to see only
  // the three category totals, as if it had three stages). Stages are grouped New -> In Progress -> Completed. Responses that are in no
  // stage (older data) get their own row so the rows always add up to the total. Without stage counts (a personal form, an older
  // backend) the three categories are shown, as before.
  // When the form's stages are known, every one of them is a row, in the order of the pipeline, and a stage nobody is in yet shows 0: the card
  // is the pipeline, not only the part of it that has responses. A stage that has responses but is no longer on the list (it was deleted) is
  // kept at the end so the rows still add up.
  const counts = overview?.stageCounts;
  const stageRows = counts?.length
    ? stages?.length
      ? [
          ...stages.map((s) => ({ stageId: s.id, name: s.name, category: s.category, count: counts.find((c) => c.stageId === s.id)?.count ?? 0 })),
          ...counts.filter((c) => !stages.some((s) => s.id === c.stageId)),
        ]
      : [...counts].sort((a, b) => SEGMENT_ORDER.indexOf(a.category) - SEGMENT_ORDER.indexOf(b.category) || b.count - a.count || a.name.localeCompare(b.name))
    : null;
  const staged = stageRows?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const rows: { key: string; label: string; count: number }[] = stageRows
    ? [
        ...stageRows.map((r) => ({ key: r.stageId, label: r.name, count: r.count })),
        ...(total > staged ? [{ key: 'no-stage', label: 'No stage yet', count: total - staged }] : []),
      ]
    : SEGMENT_ORDER.map((c) => ({ key: c, label: CATEGORY_LABELS[c], count: categoryCounts[c] }));

  const scrolls = rows.length > VISIBLE_ROWS;
  return (
    <Card className="flex h-full flex-col">
      <h3 className="bg-h5 text-(--text-primary) font-bold mb-4">Status Distribution</h3>
      {/* The donut and the list share the card's height, so it never has a blank lower half next to a taller chart. In a narrow column they
          are stacked; in a wide one (a tablet, a single column) side by side. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8 lg:flex-col lg:gap-5">
        <div role="img" aria-label={`Status distribution: ${rows.map((r) => `${r.count} ${r.label.toLowerCase()}`).join(', ')}`} className="shrink-0">
          <Donut
            size={144}
            centre={total.toLocaleString()}
            sub={total === 1 ? 'response' : 'responses'}
            segments={rows.map((row, ci) => ({ label: row.label, value: row.count, color: seriesColor(ci) }))}
          />
        </div>

        <div
          {...(scrolls ? { role: 'region', 'aria-label': 'Responses in each stage', tabIndex: 0 } : {})}
          className={bx('flex w-full min-w-0 flex-col gap-2.5', scrolls && 'max-h-44 overflow-y-auto pr-1 focus-visible:outline-2 focus-visible:outline-(--border-focus)')}
        >
          {rows.map((row, ci) => (
            <div key={row.key} className="flex items-center justify-between gap-6">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seriesColor(ci) }} />
                <span className={bx('truncate bg-body-sm font-medium', row.count === 0 ? 'text-(--text-muted)' : 'text-(--text-secondary)')} title={row.label}>{row.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={bx('bg-body-sm font-semibold', row.count === 0 ? 'text-(--text-muted)' : 'text-(--text-primary)')}>{row.count.toLocaleString()}</span>
                <span className="bg-caption text-(--text-muted) w-12 text-right">{percentOf(row.count)}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-only"><table>
        <caption>Response status distribution</caption>
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.count}</td>
              <td>{percentOf(row.count)}%</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </Card>
  );
}
