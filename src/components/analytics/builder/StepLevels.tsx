'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  BUCKET_LABEL,
  SORT_LABEL,
  chartTypeOptionList,
  kindOfRef,
  isTimeKind,
  levelFieldChoices,
  levelFor,
  naturalSortLabel,
  nextLevelField,
  optionCountOf,
  refFromValue,
  refValue,
} from '@/lib/chartBuilder';
import { MAX_LEVELS, MIN_LEVELS, type Bucket, type BuilderChartType, type DrillLevel, type SortKey } from '@/types/chartBuilder';
import type { WizardState } from './wizardState';
import type { FormField } from '@/types/form';

interface StepLevelsProps {
  fields: readonly FormField[] | undefined;
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

/** What "Grouping" says for a field that is not a date: the plain words for how its answers become bars. */
const groupingWords = (kind: ReturnType<typeof kindOfRef>): string => (kind === 'number' ? 'Automatic ranges' : kind === 'rating' ? 'Each rating' : 'Each answer');

/**
 * Step 3 of a drill-down: the levels. Level 1 is the chart people see first; a click on a bar opens that bar's responses grouped by level 2,
 * and so on. Each level is a row of its own (field, grouping, chart type, sort), at least two and at most four, and a field is used once.
 */
export function StepLevels({ fields, state, onChange }: StepLevelsProps) {
  const levels = state.levels;
  const measure = state.query.measure.type;
  const set = (next: DrillLevel[]) => onChange({ levels: next });
  const patchLevel = (i: number, p: Partial<DrillLevel>) => set(levels.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...levels];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set(next);
  };
  const addable = levels.length < MAX_LEVELS ? nextLevelField(fields, levels) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="bg-body-sm text-(--text-muted)">
          {levels.length} of {MAX_LEVELS} levels. Level 1 is the chart people see first.
        </p>
        <Button
          variant="secondary"
          size="small"
          disabled={!addable}
          onClick={() => addable && set([...levels, levelFor(fields, addable)])}
          title={levels.length >= MAX_LEVELS ? `A drill-down has at most ${MAX_LEVELS} levels.` : !addable ? 'Every field is already used.' : undefined}
        >
          <Plus size={14} aria-hidden="true" /> Add level
        </Button>
      </div>

      <ol className="m-0 flex list-none flex-col p-0">
        {levels.map((level, i) => {
          const kind = kindOfRef(fields, level.field);
          const choices = levelFieldChoices(fields, levels, i);
          const groups = (['Questions', 'Response details', 'Time'] as const).map((g) => ({ g, items: choices.filter((c) => c.group === g) })).filter((x) => x.items.length > 0);
          const typeOptions = chartTypeOptionList(kind, measure, optionCountOf(fields, level.field));
          return (
            <li key={i} className="flex flex-col">
              {i > 0 && (
                <span aria-hidden="true" className="flex h-6 items-center pl-3.5 text-(--text-muted)">
                  <ArrowDown size={14} />
                </span>
              )}
              <fieldset className="flex flex-col gap-4 rounded-xl border border-(--border-default) bg-(--surface-card) p-4">
                <legend className="sr-only">Level {i + 1}</legend>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) bg-body-sm font-semibold text-(--accent-soft-text)">
                    {i + 1}
                  </span>
                  <p className="min-w-0 flex-1 bg-body-sm font-semibold text-(--text-primary)">Level {i + 1}</p>
                  <Button variant="ghost" size="small" aria-label={`Move level ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={16} aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="small" aria-label={`Move level ${i + 1} down`} disabled={i === levels.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    aria-label={`Remove level ${i + 1}`}
                    disabled={levels.length <= MIN_LEVELS}
                    title={levels.length <= MIN_LEVELS ? `A drill-down needs at least ${MIN_LEVELS} levels.` : undefined}
                    onClick={() => set(levels.filter((_, k) => k !== i))}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    id={`level-${i}-field`}
                    label="Field"
                    value={refValue(level.field)}
                    onChange={(e) => {
                      const next = levelFor(fields, refFromValue(e.target.value));
                      // a new field starts from its own default sort and chart type
                      patchLevel(i, { field: next.field, bucket: next.bucket, sort: null, chartType: null });
                    }}
                  >
                    {groups.map(({ g, items }) => (
                      <optgroup key={g} label={g}>
                        {items.map((c) => (
                          <option key={refValue(c.ref)} value={refValue(c.ref)}>
                            {c.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>

                  {isTimeKind(kind) ? (
                    <Select id={`level-${i}-grouping`} label="Grouping" value={level.bucket ?? 'month'} onChange={(e) => patchLevel(i, { bucket: e.target.value as Bucket })}>
                      {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
                        <option key={b} value={b}>
                          {BUCKET_LABEL[b]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span className="bg-label">Grouping</span>
                      <p className="flex min-h-9 items-center bg-body-sm text-(--text-secondary)">{groupingWords(kind)}</p>
                    </div>
                  )}

                  <Select
                    id={`level-${i}-type`}
                    label="Chart type"
                    value={level.chartType ?? 'auto'}
                    onChange={(e) => patchLevel(i, { chartType: e.target.value === 'auto' ? null : (e.target.value as Exclude<BuilderChartType, 'auto'>) })}
                  >
                    {typeOptions.map((o) => (
                      <option key={o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                      </option>
                    ))}
                  </Select>

                  <Select id={`level-${i}-sort`} label="Sort by" value={level.sort ?? ''} onChange={(e) => patchLevel(i, { sort: e.target.value === '' ? null : (e.target.value as SortKey) })}>
                    <option value="">Default</option>
                    {(Object.keys(SORT_LABEL) as Exclude<SortKey, 'natural'>[]).map((s) => (
                      <option key={s} value={s}>
                        {SORT_LABEL[s]}
                      </option>
                    ))}
                    <option value="natural">{naturalSortLabel(kind)}</option>
                  </Select>
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
