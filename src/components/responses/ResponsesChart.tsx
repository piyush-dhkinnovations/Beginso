'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarsChart, PieChart as DonutChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import { fetchAllResponses } from '@/lib/fetchAllResponses';
import { responseKeys } from '@/lib/queryKeys';
import type { ResponseFilters, ResponseStats } from '@/types/response';

const CHART_HEIGHT = 240;
const DEFAULT_WINDOW_DAYS = 30;

export interface ResponsesChartProps {
  scope: string;
  formId?: string;
  filters: ResponseFilters;
  /** Reuses the stat-cards query `ResponsesHubView` already runs — stage distribution needs no
   * second fetch of the same counts. */
  stats: ResponseStats | undefined;
  statsLoading: boolean;
  statsError: boolean;
  onRetryStats: () => void;
}

function defaultRange(filters: ResponseFilters): { from: string; to: string } {
  if (filters.from && filters.to) return { from: filters.from, to: filters.to };
  const to = new Date();
  const from = new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ponytail: buckets by the raw UTC calendar day (`submittedAt.slice(0, 10)`), not the
// workspace-local day `ResponsesCalendar` computes via `localDateKey` — a trend overview doesn't
// need the same per-response timezone precision as "which day does this belong to." Upgrade path
// is `localDateKey` + a timezone prop, if that gap ever matters here.
function dailyVolume(items: { submittedAt: string }[]): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = item.submittedAt.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§21 (task 3.4). Two
 * charts — daily submissions volume, stage distribution — on the shared SVG chart
 * components (`components/ui/charts`). Each has a
 * visually-hidden data-table alternative, same precedent `StatusDistributionChart` already
 * established. `byStage` here only carries `category`, not each stage's own colour token (the
 * `GET /api/responses/stats` contract, design.md §11.2) — so per-stage colouring falls back to
 * ECharts' own palette cycle rather than the token-exact colour Board/Table use; noted as a gap,
 * not built around, since extending the stats contract is backend scope.
 */
export function ResponsesChart({ scope, formId, filters, stats, statsLoading, statsError, onRetryStats }: ResponsesChartProps) {
  // `defaultRange` calls `new Date()` when no explicit filter range is set — memoized on the
  // filters themselves (not recomputed every render) so the query key stays stable instead of
  // regenerating a fresh "now" (and therefore a fresh key) on every render, which would abandon
  // and restart the query before it ever resolves.
  // Only filters.from/filters.to actually feed defaultRange() — depending on the whole `filters`
  // object would recompute (and regenerate a fresh "now") on every unrelated filter change too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const range = useMemo(() => defaultRange(filters), [filters.from, filters.to]);
  const queryKey = [...responseKeys.list(scope, formId, { ...filters, from: range.from, to: range.to }), 'chart'];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAllResponses({ formId, ...filters, from: range.from, to: range.to }, scope),
  });

  const volume = useMemo(() => dailyVolume(data ?? []), [data]);
  const total = stats?.total ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 bg-h5 font-bold text-(--text-primary)">Daily submissions volume</h3>
        {isLoading ? (
          <Skeleton variant="block" height={CHART_HEIGHT} className="rounded-lg" />
        ) : isError ? (
          <EmptyState
            icon={<BarChart3 />}
            title="Unable to load volume"
            description="Something went wrong loading submission volume."
            actions={
              <Button variant="secondary" size="small" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          />
        ) : volume.length === 0 ? (
          <EmptyState icon={<BarChart3 />} title="No responses in this range" description="Try a wider date range to see submission volume." />
        ) : (
          <>
            <BarsChart
              data={toSegments(volume.map((v) => ({ key: v.date, label: v.date.slice(5), value: v.count })))}
              height={CHART_HEIGHT}
              ariaLabel="Daily submissions volume"
            />
            <table className="sr-only">
              <caption>Daily submissions volume</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Submissions</th>
                </tr>
              </thead>
              <tbody>
                {volume.map((v) => (
                  <tr key={v.date}>
                    <td>{v.date}</td>
                    <td>{v.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <Card>
        <h3 className="mb-4 bg-h5 font-bold text-(--text-primary)">Stage distribution</h3>
        {statsLoading ? (
          <Skeleton variant="block" height={CHART_HEIGHT} className="rounded-lg" />
        ) : statsError ? (
          <EmptyState
            icon={<PieChartIcon />}
            title="Unable to load stage distribution"
            description="Something went wrong loading stage counts."
            actions={
              <Button variant="secondary" size="small" onClick={onRetryStats}>
                Try again
              </Button>
            }
          />
        ) : total === 0 || !stats ? (
          <EmptyState icon={<PieChartIcon />} title="No responses yet" description="Responses will appear here once your form starts receiving submissions." />
        ) : (
          <>
            <DonutChart
              donut
              data={toSegments(stats.byStage.map((s) => ({ key: s.stageId, label: s.name, value: s.count })))}
              ariaLabel="Stage distribution"
              centreLabel={String(total)}
            />
            <table className="sr-only">
              <caption>Stage distribution</caption>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.byStage.map((s) => (
                  <tr key={s.stageId}>
                    <td>{s.name}</td>
                    <td>{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
}
