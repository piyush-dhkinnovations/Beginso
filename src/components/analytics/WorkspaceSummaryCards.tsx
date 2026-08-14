'use client';

import { Inbox, FileCheck2, BarChart3, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatChangeLabel } from '@/lib/analyticsChange';

interface WorkspaceSummaryCardsProps {
  totalResponses: number;
  activeForms: number;
  averageResponsesPerForm: number;
  changePercent: number | null;
  isLoading: boolean;
}

export function WorkspaceSummaryCards({
  totalResponses,
  activeForms,
  averageResponsesPerForm,
  changePercent,
  isLoading,
}: WorkspaceSummaryCardsProps) {
  const cards = [
    { label: 'Total Responses', value: String(totalResponses), icon: Inbox },
    { label: 'Active Forms', value: String(activeForms), icon: FileCheck2 },
    { label: 'Avg. Responses / Form', value: averageResponsesPerForm.toFixed(1), icon: BarChart3 },
    { label: 'Change vs Previous Period', value: formatChangeLabel(changePercent), icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isMuted = card.value === '0' || card.value === '0.0' || card.value === '—';
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
              <span className={`text-display font-bold leading-none ${isMuted ? 'text-neutral-400' : 'text-neutral-900'}`}>
                {card.value}
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
