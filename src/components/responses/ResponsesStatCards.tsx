'use client';

import { CheckCircle2, Clock, Inbox, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ResponseStats } from '@/types/response';

interface ResponsesStatCardsProps {
  stats?: ResponseStats;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function ResponsesStatCards({ stats, isLoading, isError = false, onRetry }: ResponsesStatCardsProps) {
  if (isError) {
    return (
      <Card role="alert" className="flex min-h-28 items-center justify-between gap-4 col-span-2 lg:col-span-4">
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">Unable to load response totals</p>
          <p className="mt-1 text-caption text-neutral-500">The response list is still available.</p>
        </div>
        {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
      </Card>
    );
  }

  const cards = [
    { label: 'Total', value: stats?.total ?? 0, icon: Inbox },
    { label: 'New', value: stats?.new ?? 0, icon: Sparkles },
    { label: 'In Progress', value: stats?.in_progress ?? 0, icon: Clock },
    { label: 'Completed', value: stats?.completed ?? 0, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="flex flex-col gap-2 p-4 sm:gap-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption sm:text-body-sm text-neutral-500 font-medium">{card.label}</span>
              <Icon size={20} className="sm:hidden shrink-0 text-brand-700" />
              <Icon size={24} className="hidden sm:block shrink-0 text-brand-700" />
            </div>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-neutral-200 rounded w-16" />
              </div>
            ) : (
              <span
                className={`text-display font-bold leading-none ${card.value === 0 ? 'text-neutral-400' : 'text-neutral-900'}`}
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
