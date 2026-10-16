'use client';

import { CheckCircle2, Clock, Inbox, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { AnalyticsOverview } from '@/types/analytics';

// Sprint 12 (inbox-collaboration), requirements.md §7.3 #3 — see StatusDistributionChart.tsx's
// own comment: these three labels are the fixed category enum, not a workspace-defined stage name.

interface AnalyticsStatCardsProps {
  overview?: AnalyticsOverview;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function AnalyticsStatCards({ overview, isLoading, isError = false, onRetry }: AnalyticsStatCardsProps) {
  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4 col-span-2 lg:col-span-4">
        <div>
          <p className="text-body-sm font-semibold text-text-primary">Unable to load analytics totals</p>
          <p className="mt-1 text-caption text-text-muted">The rest of the dashboard is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const cards = [
    { label: 'Total Responses', value: overview?.totalResponses ?? 0, icon: Inbox },
    { label: 'Completed', value: overview?.categoryCounts?.completed ?? 0, icon: CheckCircle2 },
    { label: 'In Progress', value: overview?.categoryCounts?.in_progress ?? 0, icon: Clock },
    { label: 'New', value: overview?.categoryCounts?.new ?? 0, icon: Sparkles },
  ];

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="flex flex-col gap-2 p-4 sm:gap-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption sm:text-body-sm text-text-muted font-medium">{card.label}</span>
              <Icon size={20} className="sm:hidden shrink-0 text-brand-700" />
              <Icon size={24} className="hidden sm:block shrink-0 text-brand-700" />
            </div>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-skeleton rounded w-16" />
              </div>
            ) : (
              <span
                className={`text-display font-bold leading-none ${card.value === 0 ? 'text-text-muted' : 'text-text-primary'}`}
              >
                {card.value}
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
