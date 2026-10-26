'use client';

import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { useChartQuery } from '@/hooks/useChartQuery';
import { ChartResult } from './ChartResult';
import { autoChartType, CHART_TYPE_NAME, chartTypeChoices, kindOfRef, optionCountOf } from '@/lib/chartBuilder';
import { effectiveTitle, type WizardState } from './wizardState';
import type { FormField } from '@/types/form';
import type { BuilderChartType, QueryEntry } from '@/types/chartBuilder';

interface ChartPreviewCardProps {
  formId: string;
  scope: string | undefined;
  fields: readonly FormField[] | undefined;
  state: WizardState;
  /** Shows the chart-type select at the card's top right (the first steps); the last step shows the card as the dashboard will. */
  onChartType?: (t: BuilderChartType) => void;
  onSelect?: (entry: QueryEntry) => void;
  heading?: string;
  height?: number;
}

/** "Automatic: Donut chart" first, then the types; a type that does not fit is listed with why, and cannot be picked. */
export function chartTypeOptions(fields: readonly FormField[] | undefined, state: WizardState) {
  const kind = kindOfRef(fields, state.query.groupBy.field);
  const measure = state.query.measure.type;
  const auto = autoChartType(kind, measure, optionCountOf(fields, state.query.groupBy.field));
  return [
    { value: 'auto', label: `Automatic: ${CHART_TYPE_NAME[auto]}`, disabled: false },
    ...chartTypeChoices(kind, measure).map((c) => ({ value: c.type, label: c.enabled ? CHART_TYPE_NAME[c.type] : `${CHART_TYPE_NAME[c.type]} (${(c.reason ?? '').replace(/\.$/, '').toLowerCase()})`, disabled: !c.enabled })),
  ];
}

/** The live chart: its title, an optional chart-type select, and the answer for the chart as it is being built. */
export function ChartPreviewCard({ formId, scope, fields, state, onChartType, onSelect, heading = 'Preview', height = 240 }: ChartPreviewCardProps) {
  const q = useChartQuery(formId, scope, state.query);
  const title = effectiveTitle(fields, state);
  const display = state.query.display ?? { values: 'counts' as const, legend: true, dataLabels: false, palette: 'theme' as const, interactive: true };
  const options = chartTypeOptions(fields, state);
  return (
    <Card className="flex flex-col gap-4" aria-label={heading} role="region">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="bg-body font-semibold text-(--text-primary)">{heading}</h3>
          <p className="break-words bg-body-sm text-(--text-muted)">{title || 'Untitled chart'}</p>
        </div>
        {onChartType && (
          <div className="w-full max-w-60 min-w-40">
            <Select id="preview-chart-type" aria-label="Chart type" value={state.chartType} onChange={(e) => onChartType(e.target.value as BuilderChartType)}>
              {options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div>
        <ChartResult
          result={q.data}
          isLoading={q.isLoading}
          isError={q.isError}
          refreshing={q.isFetching || q.settling}
          onRetry={() => void q.refetch()}
          chartType={state.chartType}
          display={display}
          onSelect={onSelect}
          label={title || 'Chart'}
          height={height}
        />
      </div>
    </Card>
  );
}
