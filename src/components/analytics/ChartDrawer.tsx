'use client';

import { useState, type ReactNode } from 'react';
import { AlignLeft, AreaChart, BarChart3, CircleDot, LineChart, PieChart, Sigma, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
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
import { bx } from '@/lib/utils';
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

// Right-side slide-over (not a modal): a compact pinned preview, then four numbered steps —
// what to chart, chart type, size, display. The dashboard stays visible behind it. Drawer unmounts its
// children when closed, so the form below starts fresh on every open.
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

const TYPE_ICON: Record<ChartType, LucideIcon> = {
  pie: PieChart,
  donut: CircleDot,
  bar: BarChart3,
  horizontal_bar: AlignLeft,
  line: LineChart,
  area: AreaChart,
  bar_time: BarChart3,
  average: Sigma,
};

function SizePictogram({ size }: { size: ChartSize }) {
  const pct = size === 'small' ? 33.3 : size === 'medium' ? 50 : 100;
  return (
    <span className="relative block h-4 w-full overflow-hidden rounded-sm border border-(--border-strong) bg-(--bg-subtle)" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 bg-(--action-primary)" style={{ width: `${pct}%` }} />
    </span>
  );
}

// A numbered step keeps a long form scannable instead of one undifferentiated column of controls.
function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="flex items-center gap-2 bg-body font-semibold text-(--text-primary)">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-(--action-primary) text-xs text-white" aria-hidden="true">
            {n}
          </span>
          {title}
        </h3>
        {hint && <p className="bg-caption mt-0.5 pl-7 text-(--text-muted)">{hint}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:pl-7">{children}</div>
    </section>
  );
}

// A selectable tile backed by a real (visually hidden) radio, so keyboard and screen-reader behaviour is unchanged.
function Choice({ id, name, checked, onSelect, children, className }: { id: string; name: string; checked: boolean; onSelect: () => void; children: ReactNode; className?: string }) {
  return (
    <label
      htmlFor={id}
      className={bx(
        'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-(--border-focus)',
        checked ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) hover:bg-(--surface-hover)',
        className,
      )}
    >
      <input id={id} type="radio" name={name} className="sr-only" checked={checked} onChange={onSelect} />
      {children}
    </label>
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
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && field) onSubmit({ fieldId: field.fieldId, type, size, title: trimmed, options, visibility });
      }}
    >
      {/* The preview is a compact confirmation, not the page: capped width, pinned while the controls scroll. */}
      <section aria-label="Live preview" className="z-10 flex flex-col gap-2 rounded-2xl border border-(--border-default) bg-(--bg-subtle) p-4 md:sticky md:top-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate bg-body font-semibold text-(--text-primary)">{def.title}</h3>
          <span className="bg-overline flex-none text-(--text-muted)">Live preview</span>
        </div>
        <div aria-live="polite" className="mx-auto w-full max-w-sm rounded-xl bg-(--surface-card) p-3">
          <ChartBody def={def} field={field} query={preview} skeletonHeight={160} />
        </div>
      </section>

      <Step n={1} title="What to chart">
        <Select id="chart-field" label="Question" value={fieldId} onChange={(e) => changeField(e.target.value)}>
          {chartable.map((f) => (
            <option key={f.fieldId} value={f.fieldId}>
              {f.label} ({FIELD_TYPE_LABEL[f.type] ?? f.type})
            </option>
          ))}
        </Select>
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
      </Step>

      <Step n={2} title="Chart type" hint="Only the types that suit this question are shown.">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Chart type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {types.map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <Choice key={t} id={`chart-type-${t}`} name="chart-type" checked={type === t} onSelect={() => setType(t)}>
                  <Icon aria-hidden="true" className={bx('size-6', type === t ? 'text-(--action-primary)' : 'text-(--text-muted)')} />
                  <span className="bg-body-sm font-medium text-(--text-primary)">{CHART_TYPE_LABEL[t]}</span>
                </Choice>
              );
            })}
          </div>
        </fieldset>
      </Step>

      <Step n={3} title="Size on the dashboard">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Size</legend>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => (
              <Choice key={s} id={`chart-size-${s}`} name="chart-size" checked={size === s} onSelect={() => setSize(s)} className="items-stretch text-left">
                <SizePictogram size={s} />
                <span className="bg-body-sm font-semibold text-(--text-primary)">{SIZE_LABEL[s]}</span>
                <span className="bg-caption text-(--text-muted)">{SIZE_FRACTION[s]}</span>
              </Choice>
            ))}
          </div>
        </fieldset>
      </Step>

      <Step n={4} title="Display">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="bg-body-sm text-(--text-secondary)">Show values as</span>
          <Segmented
            ariaLabel="Show values as"
            value={options.valueMode}
            onChange={(v) => setOptions({ ...options, valueMode: v as ChartOptions['valueMode'] })}
            options={[{ id: 'count', label: 'Counts' }, { id: 'percent', label: 'Percentages' }]}
          />
        </div>
        {kind !== 'date' && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="bg-body-sm text-(--text-secondary)">Order</span>
            <Segmented
              ariaLabel="Sort by"
              value={options.sort}
              onChange={(v) => setOptions({ ...options, sort: v as ChartOptions['sort'] })}
              options={[{ id: 'original', label: kind === 'scale' ? 'Scale order' : 'Option order' }, { id: 'value', label: 'Largest first' }]}
            />
          </div>
        )}
        {kind === 'choice' && (
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="chart-legend" className="bg-body-sm text-(--text-secondary)">Show legend</label>
            <Switch id="chart-legend" checked={options.legend} onChange={(on) => setOptions({ ...options, legend: on })} />
          </div>
        )}
      </Step>

      {canShare && scope !== 'personal' && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-(--border-default) p-4">
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
