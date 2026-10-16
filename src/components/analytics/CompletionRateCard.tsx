'use client';

import { TrendingUp } from 'lucide-react';
import { StatCard, type StatChart } from '@/components/ui/StatCard';
import { Tooltip } from '@/components/ui/Tooltip';

export interface CompletionRateCardProps {
  /** Submissions / views, 0-100. `null`/undefined = no counted views yet - shown as "—", never 0%. */
  rate: number | null | undefined;
  isLoading?: boolean;
  delta?: { label: string; direction: 'up' | 'down' | 'flat'; note?: string };
  /** Scope noun for the helper line: "this form" (default) or "a form". */
  subject?: string;
  /** Why there is no rate, shown as the "—" tooltip. Defaults to "Not enough views yet". */
  unavailableReason?: string;
  /** Too few data points to trust a ring or delta: show the figure only. */
  sparse?: boolean;
}

// Sprint 14 (requirements 1.2, OQ-3): views-based completion rate. The helper line is the spec's
// "X% of people who open this finish it"; a null rate is "—" with a "Not enough views yet" tooltip.
export function CompletionRateCard({ rate, isLoading = false, delta, subject = 'this form', sparse = false, unavailableReason = 'Not enough views yet' }: CompletionRateCardProps) {
  const hasRate = typeof rate === 'number' && Number.isFinite(rate);
  const percent = hasRate ? Math.max(0, Math.min(100, Math.round(rate))) : null;

  // No ring at all when there is no rate - an empty ring would read "0%", which is exactly what this must not say.
  const chart: StatChart | undefined = percent === null || sparse ? undefined : { kind: 'ring', percent };

  return (
    <StatCard
      label="Completion rate"
      icon={<TrendingUp aria-hidden="true" />}
      value={
        isLoading ? (
          <span className="block h-8 w-16 animate-pulse rounded bg-skeleton" />
        ) : percent === null ? (
          <Tooltip content={unavailableReason}>
            <span tabIndex={0}>
              {'—'}
              <span className="sr-only">{unavailableReason}</span>
            </span>
          </Tooltip>
        ) : (
          `${percent}%`
        )
      }
      valueClassName={!isLoading && percent === null ? 'text-(--text-disabled)' : undefined}
      note={!isLoading && percent !== null && sparse ? 'Not enough data to show a trend yet.' : !isLoading && percent !== null ? `${percent}% of people who open ${subject} finish it (all time)` : undefined}
      delta={isLoading || sparse ? undefined : delta}
      chart={isLoading ? undefined : chart}
    />
  );
}
