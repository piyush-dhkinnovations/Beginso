'use client';

import { StatCard, type StatChart } from '@/components/ui/StatCard';
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
  /** Responses per day, oldest first (last 30 days), from the analytics trends endpoint. */
  dailyResponses?: number[];
  /** Response counts of the latest forms — real per-form bars when there is no daily series. */
  formResponses?: { all: number[] };
}

// Built on ui/StatCard (large bare icon + number + label, split graph on the right). Graphs only show
// what the counts genuinely support: Published is a ratio of total forms, This Month a share of all
// responses. The Total Responses line comes from the daily trend when present, else from
// the latest forms' response counts (real data, not a time trend) — never invented.
export function StatisticsCards({
  isLoading = false,
  counts = {
    totalForms: 0,
    totalResponses: 0,
    publishedForms: 0,
    responsesThisMonth: 0,
  },
  dailyResponses,
  formResponses,
}: StatisticsCardsProps) {
  const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
  const bars = (values?: number[]): StatChart | undefined =>
    values && values.length > 1 && values.some((v) => v > 0) ? { kind: 'bars', values } : undefined;
  const cards: Array<{ label: string; value: number; icon: typeof FileText; unit?: string; chart?: StatChart }> = [
    {
      label: 'Total Forms',
      value: counts.totalForms,
      icon: FileText,
      chart: counts.totalForms > 0 ? { kind: 'ring', percent: percent(counts.publishedForms, counts.totalForms) } : undefined,
    },
    {
      label: 'Total Responses',
      value: counts.totalResponses,
      icon: MessageSquare,
      // Best data first: a real daily series, then per-form counts, and — always available — the
      // split of all responses into earlier vs this month.
      chart:
        dailyResponses && dailyResponses.length > 1 && dailyResponses.some((v) => v > 0)
          ? { kind: 'line', values: dailyResponses }
          : (bars(formResponses?.all) ?? {
              kind: 'split',
              parts: [{ value: Math.max(counts.totalResponses - counts.responsesThisMonth, 0) }, { value: counts.responsesThisMonth }],
            }),
    },
    {
      label: 'Published Forms',
      value: counts.publishedForms,
      icon: Files,
      unit: counts.totalForms > 0 ? `/ ${counts.totalForms}` : undefined,
      chart: counts.totalForms > 0 ? { kind: 'progress', percent: percent(counts.publishedForms, counts.totalForms) } : undefined,
    },
    {
      label: 'Responses This Month',
      value: counts.responsesThisMonth,
      icon: Calendar,
      chart: counts.totalResponses > 0 ? { kind: 'ring', percent: percent(counts.responsesThisMonth, counts.totalResponses) } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            icon={<Icon aria-hidden="true" />}
            unit={isLoading ? undefined : card.unit}
            chart={isLoading ? undefined : card.chart}
            value={isLoading ? <Skeleton variant="text" width={40} height={24} /> : card.value}
          />
        );
      })}
    </div>
  );
}
