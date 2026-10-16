'use client';

import { completionRateUnavailableReason } from '@/lib/completionRate';
import { CheckCircle2, Clock, Inbox, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard, type StatChart } from '@/components/ui/StatCard';
import { CompletionRateCard } from './CompletionRateCard';
import { computeChangePercent, formatChangeLabel } from '@/lib/analyticsChange';
import { MIN_TREND_POINTS, NOT_ENOUGH_DATA } from '@/lib/chartSegments';
import type { AnalyticsOverview } from '@/types/analytics';

// These three labels are the fixed category enum (Sprint 12 requirements §7.3), not a
// workspace-defined stage name.

interface AnalyticsStatCardsProps {
  overview?: AnalyticsOverview;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Responses per bucket from the trend query, oldest first — drives the Total Responses bars. */
  trend?: number[];
  /** Sprint 14 (requirements 1.3): the previous equal-length period's overview. Absent = comparison off or
   * no prior data - the delta lines are hidden, never "0%". */
  previousOverview?: AnalyticsOverview;
  /** e.g. "vs previous 30 days". */
  periodLabel?: string;
}

function delta(current: number, previous: number | undefined, note?: string) {
  if (previous === undefined) return undefined;
  const change = computeChangePercent(current, previous);
  if (change === null || change === 0) return undefined;
  return { label: formatChangeLabel(change), direction: (change > 0 ? 'up' : 'down') as 'up' | 'down', note };
}

const mutedZero = (n: number) => (n === 0 ? 'text-(--text-muted)' : undefined);

export function AnalyticsStatCards({ overview, isLoading, isError = false, onRetry, trend, previousOverview, periodLabel }: AnalyticsStatCardsProps) {
  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4 col-span-2 lg:col-span-4">
        <div>
          <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load analytics totals</p>
          <p className="mt-1 bg-caption text-(--text-muted)">The rest of the dashboard is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const total = overview?.totalResponses ?? 0;
  // Minimum-data rule: under ten responses no ring, trend line or delta - just the raw counts and one note.
  const sparse = !isLoading && total < MIN_TREND_POINTS;
  const share = (n: number): StatChart | undefined =>
    total >= MIN_TREND_POINTS ? { kind: 'ring', percent: Math.round((n / total) * 100) } : undefined;
  const counts = overview?.categoryCounts;

  const previousCounts = previousOverview?.categoryCounts;
  const cards: Array<{ label: string; value: number; icon: typeof Inbox; chart?: StatChart; delta?: ReturnType<typeof delta> }> = [
    {
      label: 'Total Responses',
      value: total,
      icon: Inbox,
      chart: !sparse && trend && trend.length > 1 && trend.some((v) => v > 0) ? { kind: 'line', values: trend } : undefined,
      delta: delta(total, previousOverview?.totalResponses, periodLabel),
    },
    { label: 'Completed', value: counts?.completed ?? 0, icon: CheckCircle2, chart: share(counts?.completed ?? 0), delta: delta(counts?.completed ?? 0, previousCounts?.completed, periodLabel) },
    { label: 'In Progress', value: counts?.in_progress ?? 0, icon: Clock, chart: share(counts?.in_progress ?? 0), delta: delta(counts?.in_progress ?? 0, previousCounts?.in_progress, periodLabel) },
    { label: 'New', value: counts?.new ?? 0, icon: Sparkles, chart: share(counts?.new ?? 0), delta: delta(counts?.new ?? 0, previousCounts?.new, periodLabel) },
  ];

  const cardsView = sparse ? cards.map((c) => ({ ...c, chart: undefined, delta: undefined })) : cards;

  // Completion rate is views-based (OQ-3) - its delta is a change in points, only when both periods have one.
  // The API rate is lifetime; in a selected range with no responses it would read 100%/stale, so show "—".
  const rate = total > 0 ? overview?.completionRate : null;
  const previousRate = previousOverview?.completionRate;
  const rateDelta =
    typeof rate === 'number' && typeof previousRate === 'number' && Math.round(rate) !== Math.round(previousRate)
      ? {
          label: `${rate > previousRate ? '↑' : '↓'} ${Math.abs(rate - previousRate).toFixed(1)} pts`,
          direction: (rate > previousRate ? 'up' : 'down') as 'up' | 'down',
          note: periodLabel,
        }
      : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cardsView.map((card, ci) => {
        const Icon = card.icon;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            icon={<Icon aria-hidden="true" />}
            value={isLoading ? <span className="block h-8 w-16 animate-pulse rounded bg-skeleton" /> : card.value}
            valueClassName={isLoading ? undefined : mutedZero(card.value)}
            note={sparse && ci === 0 ? NOT_ENOUGH_DATA : undefined}
            delta={isLoading ? undefined : card.delta}
            chart={isLoading ? undefined : card.chart}
          />
        );
      })}
      <CompletionRateCard rate={rate} unavailableReason={completionRateUnavailableReason(total, overview?.views)} isLoading={isLoading} delta={sparse ? undefined : rateDelta} sparse={sparse} />
    </div>
  );
}
