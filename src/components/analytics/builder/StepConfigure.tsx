'use client';

import { Select } from '@/components/ui/Select';
import { FilterBuilder } from './FilterBuilder';
import { StepSection } from './StepSection';
import { chartTypeOptions } from './ChartPreviewCard';
import { MEASURE_LABEL, SORT_LABEL, kindOfRef, labelOfRef, naturalSortLabel, numericFields } from '@/lib/chartBuilder';
import type { WizardState } from './wizardState';
import type { FormField } from '@/types/form';
import type { BuilderChartType, MeasureType, SortKey } from '@/types/chartBuilder';

interface StepConfigureProps {
  fields: readonly FormField[] | undefined;
  scope: string | undefined;
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

const MEASURES: MeasureType[] = ['count', 'sum', 'avg', 'min', 'max'];

/** The label of one aggregation, as it reads in the select. */
const measureOptionLabel = (m: MeasureType): string => (m === 'count' ? MEASURE_LABEL.count : `${MEASURE_LABEL[m]} of a number field`);

/** Step 3: how each group is measured, how it is drawn and sorted, and which responses count at all. */
export function StepConfigure({ fields, scope, state, onChange }: StepConfigureProps) {
  const q = state.query;
  const numbers = numericFields(fields);
  const kind = kindOfRef(fields, q.groupBy.field);
  const typeOptions = chartTypeOptions(fields, state);

  const setMeasure = (type: MeasureType) => {
    if (type === 'count') {
      onChange({ query: { ...q, measure: { type } } });
      return;
    }
    // sum, average, minimum and maximum need a number field: the first one is already chosen
    const field = q.measure.field ?? (numbers[0] ? { kind: 'question' as const, fieldId: numbers[0].fieldId } : undefined);
    onChange({ query: { ...q, measure: { type, field }, display: q.display && type !== 'sum' ? { ...q.display, values: 'counts' } : q.display } });
  };

  return (
    <div className="flex flex-col gap-6">
      <StepSection id="calc" title="How it is calculated" description="What each bar shows: how many responses, or a figure worked out from a number field.">
        <Select id="chart-measure" label="Aggregation" value={q.measure.type} onChange={(e) => setMeasure(e.target.value as MeasureType)}>
          {MEASURES.map((m) => (
            <option key={m} value={m} disabled={m !== 'count' && numbers.length === 0}>
              {measureOptionLabel(m)}
              {m !== 'count' && numbers.length === 0 ? ' (this form has no number field)' : ''}
            </option>
          ))}
        </Select>

        {q.measure.type !== 'count' && (
          <Select
            id="chart-measure-field"
            label="Number field"
            value={q.measure.field && q.measure.field.kind === 'question' ? q.measure.field.fieldId : ''}
            onChange={(e) => onChange({ query: { ...q, measure: { type: q.measure.type, field: { kind: 'question', fieldId: e.target.value } } } })}
          >
            {numbers.map((f) => (
              <option key={f.fieldId} value={f.fieldId}>
                {labelOfRef(fields, { kind: 'question', fieldId: f.fieldId })}
              </option>
            ))}
          </Select>
        )}
      </StepSection>

      <StepSection id="look" title="How it is drawn" description="The kind of chart, and the order of the groups.">
        <Select id="chart-type" label="Chart type" value={state.chartType} onChange={(e) => onChange({ chartType: e.target.value as BuilderChartType })}>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </Select>

        <Select id="chart-sort" label="Sort by" value={q.sort ?? ''} onChange={(e) => onChange({ query: { ...q, sort: e.target.value === '' ? null : (e.target.value as SortKey) } })}>
          <option value="">Default</option>
          {(Object.keys(SORT_LABEL) as Exclude<SortKey, 'natural'>[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
          <option value="natural">{naturalSortLabel(kind)}</option>
        </Select>
      </StepSection>

      <div className="border-t border-(--border-subtle) pt-6">
      <FilterBuilder fields={fields} scope={scope} filters={q.filters} onChange={(filters) => onChange({ query: { ...q, filters } })} />
      </div>
    </div>
  );
}
