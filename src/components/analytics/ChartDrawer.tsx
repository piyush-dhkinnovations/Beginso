'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { ChartBody } from './ChartBody';
import { useFieldDistribution } from '@/hooks/useFieldDistribution';
import {
  allowedChartTypes,
  CHART_TYPE_LABEL,
  chartableFields,
  defaultOptions,
  FIELD_TYPE_LABEL,
  fieldKind,
  SIZE_FRACTION,
  SIZE_LABEL,
  SIZES,
} from '@/lib/chartOptions';
import type { AnalyticsRangeParams } from '@/lib/queryKeys';
import type { ChartDefinition, ChartOptions, ChartSize, ChartType, ChartVisibility, SavedChart } from '@/types/charts';
import type { FormField } from '@/types/form';

interface ChartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = add a new chart; a chart = edit it with its current settings. */
  editing: SavedChart | null;
  formId: string;
  scope: string;
  fields: FormField[];
  range: AnalyticsRangeParams;
  /** Roles that may edit forms may share a chart with the workspace (the server enforces it too). */
  canShare: boolean;
  isSaving: boolean;
  onSubmit: (definition: ChartDefinition) => void;
}

// Right-side slide-over (not a modal): live preview first, then field -> type -> size -> title -> options.
// The dashboard stays visible behind it. Drawer unmounts its children when closed, so the form below starts
// fresh on every open.
export function ChartDrawer({ isOpen, onClose, editing, ...rest }: ChartDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width={640}
      title={editing ? 'Edit chart' : 'Add chart'}
      description="A chart answers one question about your responses. Click any part of it to see who answered that way."
    >
      <ChartDrawerForm editing={editing} onClose={onClose} {...rest} />
    </Drawer>
  );
}

function SizePictogram({ size }: { size: ChartSize }) {
  const pct = size === 'small' ? 33.3 : size === 'medium' ? 50 : 100;
  return (
    <span className="relative block h-5 w-full overflow-hidden rounded-sm border border-(--border-strong) bg-(--bg-subtle)" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 bg-(--action-primary)" style={{ width: `${pct}%` }} />
    </span>
  );
}

function ChartDrawerForm({ editing, onClose, formId, scope, fields, range, canShare, isSaving, onSubmit }: Omit<ChartDrawerProps, 'isOpen'>) {
  const chartable = chartableFields(fields);
  const first = chartable.find((f) => f.fieldId === editing?.fieldId) ?? chartable[0];

  const [fieldId, setFieldId] = useState(first?.fieldId ?? '');
  const [type, setType] = useState<ChartType>(editing?.type ?? allowedChartTypes(first)[0]);
  const [size, setSize] = useState<ChartSize>(editing?.size ?? 'medium');
  const [title, setTitle] = useState(editing?.title ?? first?.label ?? '');
  const [titleTouched, setTitleTouched] = useState(!!editing);
  const [options, setOptions] = useState<ChartOptions>(editing?.options ?? defaultOptions(first));
  const [visibility, setVisibility] = useState<ChartVisibility>(editing?.visibility ?? 'private');

  const field = chartable.find((f) => f.fieldId === fieldId);
  const types = allowedChartTypes(field);
  const kind = field ? fieldKind(field) : undefined;
  const trimmed = title.trim();
  const valid = !!field && types.includes(type) && trimmed.length > 0;

  function changeField(id: string) {
    const next = chartable.find((f) => f.fieldId === id);
    const nextTypes = allowedChartTypes(next);
    setFieldId(id);
    // Re-filter the types, and reset a selected type that the new field cannot show.
    setType((t) => (nextTypes.includes(t) ? t : nextTypes[0]));
    setOptions((o) => ({ ...o, sort: defaultOptions(next).sort }));
    if (!titleTouched && next) setTitle(next.label);
  }

  const def = { type, options, title: trimmed || field?.label || 'Preview' };
  const preview = useFieldDistribution({ scope, formId, field, range, enabled: !!field && types.includes(type) });

  if (chartable.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="bg-body-sm text-(--text-secondary)">
          None of this form&apos;s questions can be charted yet. Charts work with dropdown, multiple choice, checkbox, rating, number and date questions - long text and
          other free-form answers can&apos;t be summarised.
        </p>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && field) onSubmit({ fieldId: field.fieldId, type, size, title: trimmed, options, visibility });
      }}
    >
      <section aria-label="Live preview" className="md:sticky md:top-0 z-10 flex flex-col gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) p-3 shadow-sm">
        <p className="bg-overline text-(--text-muted)">Live preview</p>
        <h3 className="bg-body font-semibold text-(--text-primary)">{def.title}</h3>
        <div aria-live="polite">
          <ChartBody def={def} field={field} query={preview} skeletonHeight={180} />
        </div>
      </section>

      <Select id="chart-field" label="Field" value={fieldId} onChange={(e) => changeField(e.target.value)}>
        {chartable.map((f) => (
          <option key={f.fieldId} value={f.fieldId}>
            {f.label} ({FIELD_TYPE_LABEL[f.type] ?? f.type})
          </option>
        ))}
      </Select>

      <fieldset className="flex flex-col gap-2">
        <legend className="bg-label mb-1">Chart type</legend>
        <div className="grid grid-cols-2 gap-2">
          {types.map((t) => (
            <Radio key={t} id={`chart-type-${t}`} name="chart-type" label={CHART_TYPE_LABEL[t]} checked={type === t} onChange={() => setType(t)} />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="bg-label mb-1">Size</legend>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((s) => (
            <label
              key={s}
              className="flex min-h-14 cursor-pointer flex-col gap-1.5 rounded-lg border border-(--border-default) p-2 has-checked:border-(--action-primary) has-checked:bg-(--accent-soft) has-focus-visible:outline-2 has-focus-visible:outline-(--border-focus)"
            >
              <input type="radio" name="chart-size" className="sr-only" checked={size === s} onChange={() => setSize(s)} />
              <SizePictogram size={s} />
              <span className="bg-caption font-semibold text-(--text-primary)">{SIZE_LABEL[s]}</span>
              <span className="bg-caption text-(--text-muted)">{SIZE_FRACTION[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Input
        id="chart-title"
        label="Title"
        value={title}
        maxLength={80}
        onChange={(e) => {
          setTitle(e.target.value);
          setTitleTouched(true);
        }}
        error={trimmed.length === 0 ? 'Give the chart a title.' : undefined}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="bg-label mb-1">Options</legend>
        <div role="radiogroup" aria-label="Show values as" className="flex flex-wrap gap-x-5 gap-y-1">
          <Radio id="chart-value-count" name="chart-value" label="Show counts" checked={options.valueMode === 'count'} onChange={() => setOptions({ ...options, valueMode: 'count' })} />
          <Radio id="chart-value-percent" name="chart-value" label="Show percentages" checked={options.valueMode === 'percent'} onChange={() => setOptions({ ...options, valueMode: 'percent' })} />
        </div>
        {kind === 'choice' && (
          <Checkbox id="chart-legend" label="Show legend" checked={options.legend} onChange={(e) => setOptions({ ...options, legend: e.target.checked })} />
        )}
        {kind !== 'date' && (
          <div role="radiogroup" aria-label="Sort by" className="flex flex-wrap gap-x-5 gap-y-1">
            <Radio id="chart-sort-original" name="chart-sort" label={kind === 'scale' ? 'Scale order (1, 2, 3...)' : 'Original option order'} checked={options.sort === 'original'} onChange={() => setOptions({ ...options, sort: 'original' })} />
            <Radio id="chart-sort-value" name="chart-sort" label="Largest first" checked={options.sort === 'value'} onChange={() => setOptions({ ...options, sort: 'value' })} />
          </div>
        )}
      </fieldset>

      {canShare && scope !== 'personal' && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-(--border-default) p-3">
          <label htmlFor="chart-share" className="flex flex-col gap-0.5">
            <span className="bg-body-sm font-semibold text-(--text-primary)">Share with workspace</span>
            <span className="bg-caption text-(--text-muted)">
              {visibility === 'workspace' ? 'Everyone who can see this form\'s analytics sees it, read-only.' : 'Private - only you see this chart.'}
            </span>
          </label>
          <Switch id="chart-share" checked={visibility === 'workspace'} onChange={(on) => setVisibility(on ? 'workspace' : 'private')} />
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-(--border-default) bg-(--surface-card) px-1 py-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={!valid} isLoading={isSaving}>{editing ? 'Save changes' : 'Add to dashboard'}</Button>
      </div>
    </form>
  );
}
