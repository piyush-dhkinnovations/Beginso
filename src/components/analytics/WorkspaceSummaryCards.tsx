'use client';

import { BarChart3, FileCheck2, MessageSquare } from 'lucide-react';
import { StatCard, type StatChart } from '@/components/ui/StatCard';
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
  /** Responses per bucket for the range, oldest first — drives the Total Responses bars. */
  trend?: number[];
  /** Total for the previous equal-length period — the Total Responses fallback chart compares it
   * with the current total when there is no trend or per-form data to draw bars from. */
  previousTotalResponses?: number;
  /** Response totals of the busiest forms — drives the Avg. Responses / Form bars. */
  perFormResponses: number[];
  isLoading: boolean;
}

function delta(change: number | null, periodLabel: string) {
  if (change === null || change === 0) return undefined;
  return { label: formatChangeLabel(change), direction: (change > 0 ? 'up' : 'down') as 'up' | 'down', note: periodLabel };
}

const bars = (values?: number[]): StatChart | undefined =>
  values && values.length > 1 && values.some((v) => v > 0) ? { kind: 'bars', values: values.slice(-12) } : undefined;

// Four stat cards for Workspace Analytics — large bare icon + number + label on the left, a chart
// on the right — always one, so the row reads evenly. Best data first, with a real fallback each:
//   Total Responses  bars from the daily trend → bars per form → previous vs current period split
//   Active Forms     progress: published / total
//   Avg / Form       bars per form → progress: the average against the busiest form
//   Completion Rate  ring (an empty ring when no form has responses yet)
export function WorkspaceSummaryCards({
  totalResponses,
  activeForms,
  totalForms,
  averageResponsesPerForm,
  completionRate,
  changes,
  periodLabel,
  trend,
  previousTotalResponses,
  perFormResponses,
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
    chart?: StatChart;
  }> = [
    {
      label: 'Total Responses',
      value: String(totalResponses),
      icon: MessageSquare,
      muted: totalResponses === 0,
      delta: delta(changes.responses, periodLabel),
      chart:
        bars(trend) ??
        bars(perFormResponses) ??
        ({ kind: 'split', parts: [{ value: previousTotalResponses ?? 0 }, { value: totalResponses }] } as StatChart),
    },
    {
      label: 'Active Forms',
      value: String(activeForms),
      unit: totalForms > 0 ? `/ ${totalForms}` : undefined,
      icon: FileCheck2,
      muted: activeForms === 0,
      chart: totalForms > 0 ? { kind: 'progress', percent: Math.round((activeForms / totalForms) * 100) } : undefined,
    },
    {
      label: 'Avg. Responses / Form',
      value: averageResponsesPerForm.toFixed(1),
      icon: BarChart3,
      muted: averageResponsesPerForm === 0,
      delta: delta(changes.average, periodLabel),
      chart:
        bars([...perFormResponses].sort((a, b) => a - b)) ??
        ({ kind: 'progress', percent: Math.max(...perFormResponses, 0) > 0 ? Math.round((averageResponsesPerForm / Math.max(...perFormResponses)) * 100) : 0 } as StatChart),
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
            chart={isLoading || sparse ? undefined : card.chart}
          />
        );
      })}
      <CompletionRateCard rate={completionRate} isLoading={isLoading} delta={sparse ? undefined : delta(changes.completion, periodLabel)} subject="a form" sparse={sparse} />
    </div>
  );
}
