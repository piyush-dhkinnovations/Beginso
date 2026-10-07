'use client';

import { CheckCircle2, Clock, Inbox, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard, type StatChart } from '@/components/ui/StatCard';
import type { ResponseStats } from '@/types/response';
import { CATEGORY_LABELS } from '@/types/stage';

interface ResponsesStatCardsProps {
  stats?: ResponseStats;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.3 #2, design.md §2/§15: stats now come from
 * `ResponseStats.byCategory` (`GET /api/responses/stats`, extended for stages) rather than the
 * removed `new`/`in_progress`/`completed` fields — the category buckets (OQ-11's default) keep a
 * custom stage set legible as three cards instead of a hardcoded per-status label.
 * Each card except Total carries a ring showing its share of all responses.
 */
export function ResponsesStatCards({ stats, isLoading, isError = false, onRetry }: ResponsesStatCardsProps) {
  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4 col-span-2 lg:col-span-4">
        <div>
          <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load response totals</p>
          <p className="mt-1 bg-caption text-(--text-muted)">The response list is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const total = stats?.total ?? 0;
  const share = (n: number): StatChart | undefined =>
    total > 0 ? { kind: 'ring', percent: Math.round((n / total) * 100) } : undefined;
  const byCategory = stats?.byCategory ?? { new: 0, in_progress: 0, completed: 0 };
  const cards: Array<{ label: string; value: number; icon: typeof Inbox; chart?: StatChart }> = [
    { label: 'Total', value: total, icon: Inbox },
    { label: 'Unread', value: stats?.unread ?? 0, icon: Mail, chart: share(stats?.unread ?? 0) },
    { label: CATEGORY_LABELS.new, value: byCategory.new, icon: Clock, chart: share(byCategory.new) },
    { label: CATEGORY_LABELS.completed, value: byCategory.completed, icon: CheckCircle2, chart: share(byCategory.completed) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            icon={<Icon aria-hidden="true" />}
            value={isLoading ? <span className="block h-8 w-16 animate-pulse rounded bg-skeleton" /> : card.value}
            valueClassName={!isLoading && card.value === 0 ? 'text-(--text-muted)' : undefined}
            chart={isLoading ? undefined : card.chart}
          />
        );
      })}
    </div>
  );
}
