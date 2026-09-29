'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { getBaseChartOption, CHART_COLORS, type EChartsOption } from '@/lib/chartTheme';
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

function buildVolumeOption(series: { date: string; count: number }[]): EChartsOption {
  const base = getBaseChartOption();
  return {
    ...base,
    grid: { left: 40, right: 16, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: series.map((s) => s.date) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: series.map((s) => s.count), itemStyle: { color: CHART_COLORS.brand } }],
  };
}

function buildStageOption(byStage: ResponseStats['byStage']): EChartsOption {
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
        data: byStage.map((s) => ({ name: s.name, value: s.count })),
      },
    ],
  };
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§21 (task 3.4). Two
 * charts — daily submissions volume, stage distribution — on the existing `components/charts` +
 * `chartTheme` (no new charting dependency: `package.json`'s chart deps are untouched). Each has a
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
        <h3 className="mb-4 text-heading-2 font-bold text-text-primary">Daily submissions volume</h3>
        {isLoading ? (
          <Skeleton variant="block" height={CHART_HEIGHT} className="rounded-lg" />
        ) : isError ? (
          <EmptyState
            icon={<BarChart3 />}
            heading="Unable to load volume"
            body="Something went wrong loading submission volume."
            action={
              <Button variant="secondary" size="small" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          />
        ) : volume.length === 0 ? (
          <EmptyState icon={<BarChart3 />} heading="No responses in this range" body="Try a wider date range to see submission volume." />
        ) : (
          <>
            <EChartContainer option={buildVolumeOption(volume)} height={CHART_HEIGHT} ariaLabel="Daily submissions volume" />
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
        <h3 className="mb-4 text-heading-2 font-bold text-text-primary">Stage distribution</h3>
        {statsLoading ? (
          <Skeleton variant="block" height={CHART_HEIGHT} className="rounded-lg" />
        ) : statsError ? (
          <EmptyState
            icon={<PieChartIcon />}
            heading="Unable to load stage distribution"
            body="Something went wrong loading stage counts."
            action={
              <Button variant="secondary" size="small" onClick={onRetryStats}>
                Try again
              </Button>
            }
          />
        ) : total === 0 || !stats ? (
          <EmptyState icon={<PieChartIcon />} heading="No responses yet" body="Responses will appear here once your form starts receiving submissions." />
        ) : (
          <>
            <EChartContainer option={buildStageOption(stats.byStage)} height={CHART_HEIGHT} ariaLabel="Stage distribution" />
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
