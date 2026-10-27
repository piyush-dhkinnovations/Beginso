'use client';

import { Select } from '@/components/ui/Select';
import { StepSection } from './StepSection';
import { MEASURE_LABEL, labelOfRef, numericFields } from '@/lib/chartBuilder';
import type { WizardState } from './wizardState';
import type { FormField } from '@/types/form';
import type { MeasureType } from '@/types/chartBuilder';

const MEASURES: MeasureType[] = ['count', 'sum', 'avg', 'min', 'max'];

/** The label of one aggregation, as it reads in the select. */
const measureOptionLabel = (m: MeasureType): string => (m === 'count' ? MEASURE_LABEL.count : `${MEASURE_LABEL[m]} of a number field`);

interface MeasureSectionProps {
  fields: readonly FormField[] | undefined;
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

/** "How it is calculated": what each bar shows. Shared by the simple chart (step 3) and the drill-down chart (step 2). */
export function MeasureSection({ fields, state, onChange }: MeasureSectionProps) {
  const q = state.query;
  const numbers = numericFields(fields);

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
  );
}
