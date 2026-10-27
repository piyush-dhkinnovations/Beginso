'use client';

import { CharCount } from '@/components/ui/CharCount';
import { StepSection } from './StepSection';
import { FilterBuilder } from './FilterBuilder';
import { MeasureSection } from './MeasureSection';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BUCKET_LABEL, FIELD_TAG, SYSTEM_FIELDS, groupableFields, isTimeKind, kindOfRef, refFromValue, refValue } from '@/lib/chartBuilder';
import { shownTitle, TITLE_MAX, type WizardState } from './wizardState';
import type { FormField } from '@/types/form';
import type { Bucket, ChartQuery } from '@/types/chartBuilder';

interface StepBasicsProps {
  formTitle: string | undefined;
  scope?: string;
  fields: readonly FormField[] | undefined;
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

/** What the "Group by field" select is showing: the selected field's type, in a small read-only tag at its right. */
function tagOfRef(fields: readonly FormField[] | undefined, state: WizardState): string {
  const ref = state.query.groupBy.field;
  if (ref.kind === 'system') return SYSTEM_FIELDS.find((s) => s.key === ref.key)?.tag ?? '';
  const f = groupableFields(fields).find((x) => x.fieldId === ref.fieldId);
  return f ? (FIELD_TAG[f.type] ?? '') : '';
}

/** Step 2: the form (locked to this one), the title, the field to group by and, for dates, how to group them. */
export function StepBasics({ formTitle, scope, fields, state, onChange }: StepBasicsProps) {
  const title = shownTitle(fields, state);
  const kind = kindOfRef(fields, state.query.groupBy.field);
  const questions = groupableFields(fields);

  const setQuery = (q: ChartQuery) => onChange({ query: q });
  const pickField = (value: string) => {
    const field = refFromValue(value);
    const next = kindOfRef(fields, field);
    // a new field starts from its own default sort, and a date gets a grouping
    setQuery({ ...state.query, sort: null, groupBy: { field, ...(isTimeKind(next) ? { bucket: 'month' as Bucket } : {}) } });
  };

  return (
    <div className="flex flex-col gap-6">
      <StepSection id="about-chart" title="About the chart" description="Which form it is for, and what it is called on the dashboard.">
      <Select id="chart-form" label="Form" value="form" disabled>
        <option value="form">{formTitle ?? 'This form'}</option>
      </Select>

      <div className="flex flex-col gap-1.5">
        <Input
          id="chart-title"
          label="Chart title"
          value={title}
          maxLength={TITLE_MAX}
          placeholder="For example: Responses by plan"
          aria-describedby="chart-title-count"
          onChange={(e) => onChange({ title: e.target.value, titleTouched: true })}
        />
        <CharCount id="chart-title-count" length={title.length} max={TITLE_MAX} />
      </div>
      </StepSection>

      {state.kind === 'drilldown' ? (
        <>
          <MeasureSection fields={fields} state={state} onChange={onChange} />
          <div className="border-t border-(--border-subtle) pt-6">
            <FilterBuilder fields={fields} scope={scope} filters={state.query.filters} onChange={(filters) => setQuery({ ...state.query, filters })} />
          </div>
        </>
      ) : (
      <StepSection id="what-chart" title="What to chart" description="The question whose answers become the bars. Dates can be grouped by day, week, month or year.">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="chart-group-field" className="bg-label">
          Group by field
        </label>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Select id="chart-group-field" aria-label="Group by field" value={refValue(state.query.groupBy.field)} onChange={(e) => pickField(e.target.value)}>
              {questions.length > 0 && (
                <optgroup label="Questions">
                  {questions.map((f) => (
                    <option key={f.fieldId} value={`q:${f.fieldId}`}>
                      {f.label || 'Untitled question'}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Response details">
                {SYSTEM_FIELDS.filter((s) => s.group === 'Response details').map((s) => (
                  <option key={s.key} value={`s:${s.key}`}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Time">
                {SYSTEM_FIELDS.filter((s) => s.group === 'Time').map((s) => (
                  <option key={s.key} value={`s:${s.key}`}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
          <span className="shrink-0 rounded-full bg-(--bg-sunken) px-2.5 py-1 bg-caption font-medium text-(--text-secondary)" aria-label={`Field type: ${tagOfRef(fields, state)}`}>
            {tagOfRef(fields, state)}
          </span>
        </div>
        {kind === 'number' && <p className="bg-caption text-(--text-muted)">Numbers are grouped into ranges automatically.</p>}
      </div>

      {isTimeKind(kind) && (
        <Select
          id="chart-bucket"
          label="Date grouping"
          value={state.query.groupBy.bucket ?? 'month'}
          onChange={(e) => setQuery({ ...state.query, groupBy: { ...state.query.groupBy, bucket: e.target.value as Bucket } })}
        >
          {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
            <option key={b} value={b}>
              {BUCKET_LABEL[b]}
            </option>
          ))}
        </Select>
      )}
      </StepSection>
      )}
    </div>
  );
}
