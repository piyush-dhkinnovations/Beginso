'use client';

import { CheckCircle2, Clock, Inbox, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ResponseStats } from '@/types/response';

interface ResponsesStatCardsProps {
  stats?: ResponseStats;
  isLoading: boolean;
}

export function ResponsesStatCards({ stats, isLoading }: ResponsesStatCardsProps) {
  const cards = [
    { label: 'Total', value: stats?.total ?? 0, icon: Inbox },
    { label: 'New', value: stats?.new ?? 0, icon: Sparkles },
    { label: 'In Progress', value: stats?.in_progress ?? 0, icon: Clock },
    { label: 'Completed', value: stats?.completed ?? 0, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-neutral-500 font-medium">{card.label}</span>
              <Icon size={24} className="text-brand-700" />
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
