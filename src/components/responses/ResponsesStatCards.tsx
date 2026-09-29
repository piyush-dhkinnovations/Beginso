'use client';

import { CheckCircle2, Clock, Inbox, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
 */
export function ResponsesStatCards({ stats, isLoading, isError = false, onRetry }: ResponsesStatCardsProps) {
  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4 col-span-2 lg:col-span-4">
        <div>
          <p className="text-body-sm font-semibold text-text-primary">Unable to load response totals</p>
          <p className="mt-1 text-caption text-text-muted">The response list is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const byCategory = stats?.byCategory ?? { new: 0, in_progress: 0, completed: 0 };
  const cards = [
    { label: 'Total', value: stats?.total ?? 0, icon: Inbox },
    { label: 'Unread', value: stats?.unread ?? 0, icon: Mail },
    { label: CATEGORY_LABELS.new, value: byCategory.new, icon: Clock },
    { label: CATEGORY_LABELS.completed, value: byCategory.completed, icon: CheckCircle2 },
  ];

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
