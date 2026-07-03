'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { FileText, MessageSquare, Files, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    totalForms: 12,
    totalResponses: 148,
    publishedForms: 8,
    responsesThisMonth: 45
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-neutral-500 font-medium">
                {card.label}
              </span>
              <Icon size={24} className="text-brand-700" />
            </div>
            
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-8 bg-neutral-200 rounded w-16" />
                <div className="h-3 bg-neutral-200 rounded w-24" />
              </div>
            ) : (
              <div>
                <span className={cn(
                  "text-display font-bold leading-none",
                  card.value === 0 ? "text-neutral-400" : "text-neutral-900"
                )}>
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
