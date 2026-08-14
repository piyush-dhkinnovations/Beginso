'use client';

import { Card } from '@/components/ui/Card';
import { FileText, MessageSquare, Files, Calendar } from 'lucide-react';


interface StatisticsCardsProps {
  isLoading?: boolean;
  counts?: {
    totalForms: number;
    totalResponses: number;
    publishedForms: number;
    responsesThisMonth: number;
  };
}

export function StatisticsCards({ 
  isLoading = false,
  counts = {
    totalForms: 0,
    totalResponses: 0,
    publishedForms: 0,
    responsesThisMonth: 0
  }
}: StatisticsCardsProps) {
  const cards = [
    {
      label: 'Total Forms',
      value: counts.totalForms,
      icon: FileText,
      color: 'text-brand-700'
    },
    {
      label: 'Total Responses',
      value: counts.totalResponses,
      icon: MessageSquare,
      color: 'text-brand-700'
    },
    {
      label: 'Published Forms',
      value: counts.publishedForms,
      icon: Files,
      color: 'text-brand-700'
    },
    {
      label: 'Responses This Month',
      value: counts.responsesThisMonth,
      icon: Calendar,
      color: 'text-brand-700'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="flex flex-col gap-2 p-4 sm:gap-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption sm:text-body-sm text-neutral-500 font-medium">
                {card.label}
              </span>
              <Icon size={20} className="sm:hidden shrink-0 text-brand-700" />
              <Icon size={24} className="hidden sm:block shrink-0 text-brand-700" />
            </div>
            
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-8 bg-neutral-200 rounded w-16" />
                <div className="h-3 bg-neutral-200 rounded w-24" />
              </div>
            ) : (
              <div>
                <span
                  className={`text-display font-bold leading-none ${card.value === 0 ? 'text-neutral-400' : 'text-neutral-900'}`}
                >
                  {card.value}
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
