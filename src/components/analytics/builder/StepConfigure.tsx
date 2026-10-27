'use client';

import { Select } from '@/components/ui/Select';
import { FilterBuilder } from './FilterBuilder';
import { StepSection } from './StepSection';
import { MeasureSection } from './MeasureSection';
import { StepLevels } from './StepLevels';
import { chartTypeOptions } from './ChartPreviewCard';
import { SORT_LABEL, kindOfRef, naturalSortLabel } from '@/lib/chartBuilder';
import type { WizardState } from './wizardState';
import type { FormField } from '@/types/form';
import type { BuilderChartType, SortKey } from '@/types/chartBuilder';

interface StepConfigureProps {
  fields: readonly FormField[] | undefined;
  scope: string | undefined;
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

/** Step 3: how each group is measured, how it is drawn and sorted, and which responses count at all. A drill-down adds its levels here instead. */
export function StepConfigure({ fields, scope, state, onChange }: StepConfigureProps) {
  const q = state.query;
  const kind = kindOfRef(fields, q.groupBy.field);
  const typeOptions = chartTypeOptions(fields, state);
  if (state.kind === 'drilldown') return <StepLevels fields={fields} state={state} onChange={onChange} />;

  return (
    <div className="flex flex-col gap-6">
      <MeasureSection fields={fields} state={state} onChange={onChange} />

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
