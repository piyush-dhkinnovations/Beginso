'use client';

import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
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

// Migrated onto ui/StatCard (built Sprint 7 for exactly this) — was still on raw pre-V2 Tailwind
// classes (text-display, text-neutral-500, p-4 sm:p-6), which read visually inconsistent with
// the rest of a page otherwise built on beginso-ui.css tokens, and had no dark-mode styling.
export function StatisticsCards({
  isLoading = false,
  counts = {
    totalForms: 0,
    totalResponses: 0,
    publishedForms: 0,
    responsesThisMonth: 0,
  },
}: StatisticsCardsProps) {
  const cards = [
    { label: 'Total Forms', value: counts.totalForms, icon: FileText },
    { label: 'Total Responses', value: counts.totalResponses, icon: MessageSquare },
    { label: 'Published Forms', value: counts.publishedForms, icon: Files },
    { label: 'Responses This Month', value: counts.responsesThisMonth, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            icon={<Icon className="bg-icon" aria-hidden="true" />}
            value={isLoading ? <Skeleton variant="text" width={40} height={24} /> : card.value}
          />
        );
      })}
    </div>
  );
}
