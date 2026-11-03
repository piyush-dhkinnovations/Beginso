'use client';

import { BarChart3, FileCheck2, MessageSquare } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatChangeLabel } from '@/lib/analyticsChange';
import { MIN_TREND_POINTS, NOT_ENOUGH_DATA } from '@/lib/chartSegments';
import { CompletionRateCard } from './CompletionRateCard';

export interface WorkspaceSummaryChanges {
  responses: number | null;
  average: number | null;
  completion: number | null;
}

interface WorkspaceSummaryCardsProps {
  totalResponses: number;
  activeForms: number;
  totalForms: number;
  averageResponsesPerForm: number;
  /** Views-weighted completion across forms with counted views, 0-100; null (shown "—", never 0%)
   * when no form has a counted view (Sprint 14, OQ-3). */
  completionRate: number | null;
  /** Change vs the previous equal-length period; null = no baseline worth comparing against. */
  changes: WorkspaceSummaryChanges;
  /** e.g. "vs previous 30 days". */
  periodLabel: string;
  isLoading: boolean;
}

function delta(change: number | null, periodLabel: string) {
  if (change === null || change === 0) return undefined;
  return { label: formatChangeLabel(change), direction: (change > 0 ? 'up' : 'down') as 'up' | 'down', note: periodLabel };
}

const count = (n: number) => n.toLocaleString('en-US');
// 1,170 not 1170.0: one decimal only when the average has a fraction worth showing
const average = (n: number) => (Number.isInteger(Math.round(n * 10) / 10) ? count(Math.round(n)) : n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// Four stat cards for Workspace Analytics: a large bare icon, the number and its label, and a change against the previous period when
// there is one. No decorative graphs: the chart below carries the trend, and a bar or ring that says nothing is noise.
export function WorkspaceSummaryCards({
  totalResponses,
  activeForms,
  totalForms,
  averageResponsesPerForm,
  completionRate,
  changes,
  periodLabel,
  isLoading,
}: WorkspaceSummaryCardsProps) {
  // Minimum-data rule: under ten responses, raw counts only - no bars, rings, progress or deltas.
  const sparse = !isLoading && totalResponses < MIN_TREND_POINTS;
  const skeleton = <span className="block h-8 w-16 animate-pulse rounded bg-(--border-default)" />;

  const cards: Array<{
    label: string;
    value: string;
    unit?: string;
    icon: typeof MessageSquare;
    muted: boolean;
    delta?: ReturnType<typeof delta>;
  }> = [
    {
      label: 'Total Responses',
      value: count(totalResponses),
      icon: MessageSquare,
      muted: totalResponses === 0,
      delta: delta(changes.responses, periodLabel),
    },
    {
      label: 'Active Forms',
      value: count(activeForms),
      unit: totalForms > 0 ? `/ ${totalForms}` : undefined,
      icon: FileCheck2,
      muted: activeForms === 0,
    },
    {
      label: 'Avg. Responses / Form',
      value: average(averageResponsesPerForm),
      icon: BarChart3,
      muted: averageResponsesPerForm === 0,
      delta: delta(changes.average, periodLabel),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, ci) => {
        const Icon = card.icon;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            icon={<Icon aria-hidden="true" />}
            value={isLoading ? skeleton : card.value}
            unit={isLoading ? undefined : card.unit}
            valueClassName={!isLoading && card.muted ? 'text-(--text-disabled)' : undefined}
            note={sparse && ci === 0 ? NOT_ENOUGH_DATA : undefined}
            delta={isLoading || sparse ? undefined : card.delta}
          />
        );
      })}
      <CompletionRateCard rate={completionRate} isLoading={isLoading} delta={sparse ? undefined : delta(changes.completion, periodLabel)} subject="a form" sparse={sparse} />
    </div>
  );
}
