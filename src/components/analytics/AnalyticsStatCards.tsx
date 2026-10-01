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
          <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load analytics totals</p>
          <p className="mt-1 bg-caption text-(--text-muted)">The rest of the dashboard is still available.</p>
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="flex flex-col gap-2 p-4 sm:gap-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="bg-caption sm:bg-body-sm text-(--text-muted) font-medium">{card.label}</span>
              <Icon size={20} className="sm:hidden shrink-0 text-(--accent-soft-text)" />
              <Icon size={24} className="hidden sm:block shrink-0 text-(--accent-soft-text)" />
            </div>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-skeleton rounded w-16" />
              </div>
            ) : (
              <span
                className={`bg-h3 font-bold leading-none ${card.value === 0 ? 'text-(--text-muted)' : 'text-(--text-primary)'}`}
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
