'use client';

import { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useMembers } from '@/hooks/useMembers';
import { useStages } from '@/hooks/useStages';
import { useTags } from '@/hooks/useTags';
import {
  MAX_CONDITIONS,
  OP_LABEL,
  addCondition,
  addGroup,
  conditionCount,
  conditionFor,
  filterableRefs,
  firstFilterRef,
  isCondition,
  isNumericFilterKind,
  kindOfRef,
  opsForKind,
  refFromValue,
  refValue,
  removeCondition,
  toggleOp,
  updateCondition,
} from '@/lib/chartBuilder';
import { bx } from '@/lib/utils';
import type { FormField } from '@/types/form';
import type { FilterCondition, FilterGroup } from '@/types/chartBuilder';

interface FilterBuilderProps {
  fields: readonly FormField[] | undefined;
  scope: string | undefined;
  filters: FilterGroup | undefined;
  onChange: (next: FilterGroup | undefined) => void;
}

/** AND / OR between rows. A real button: click it to switch (the label says what it does, for a screen reader). */
function JoinChip({ op, onToggle, where }: { op: 'and' | 'or'; onToggle: () => void; where: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${where} are joined by ${op === 'and' ? 'AND' : 'OR'}. Switch to ${op === 'and' ? 'OR' : 'AND'}`}
        className="rounded-full bg-(--accent-soft) px-3 py-0.5 bg-caption font-semibold text-(--accent-soft-text) hover:brightness-95 focus-visible:outline-2 focus-visible:outline-(--border-focus)"
      >
        {op === 'and' ? 'AND' : 'OR'}
      </button>
      <span aria-hidden="true" className="h-px flex-1 bg-(--border-subtle)" />
    </div>
  );
}

interface RowProps {
  fields: readonly FormField[] | undefined;
  scope: string | undefined;
  condition: FilterCondition;
  index: number;
  groupIndex?: number;
  onChange: (c: FilterCondition) => void;
  onRemove: () => void;
}

function ConditionRow({ fields, scope, condition, index, groupIndex, onChange, onRemove }: RowProps) {
  const uid = useId();
  const personal = !scope || scope === 'personal';
  const refs = filterableRefs(fields, !personal);
  const { data: stages = [] } = useStages(scope);
  const { data: members = [] } = useMembers(scope);
  const { data: tags = [] } = useTags(scope);
  const kind = kindOfRef(fields, condition.field);
  const numeric = isNumericFilterKind(kind);
  const where = `Filter ${(groupIndex !== undefined ? `${groupIndex + 1}.` : '') + (index + 1)}`;

  const choices: { value: string; label: string }[] = (() => {
    if (kind === 'stage') return stages.map((s) => ({ value: s.id, label: s.name }));
    if (kind === 'assignee') return members.map((m) => ({ value: m.userId, label: m.name }));
    if (kind === 'tags') return tags.map((t) => ({ value: t.id, label: t.name }));
    if (condition.field.kind === 'question') {
      const f = (fields ?? []).find((x) => x.fieldId === (condition.field as { fieldId: string }).fieldId);
      if (f?.type === 'yes_no') return [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];
      const options = (f as { options?: unknown } | undefined)?.options;
      return Array.isArray(options) ? options.map((o) => ({ value: String(o), label: String(o) })) : [];
    }
    return [];
  })();

  const changeField = (value: string) => onChange(conditionFor(fields, refFromValue(value)));

  return (
    // One row on a wide screen: field, condition, value, remove. On a narrow one the field and the remove button share the first line and the
    // condition and the value take a line each, so nothing wraps under another and the remove button never ends up alone on a line.
    <div role="group" aria-label={where} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
      <div className="min-w-0">
        <Select id={`${uid}-f`} aria-label={`${where}: field`} value={refValue(condition.field)} onChange={(e) => changeField(e.target.value)}>
          {(['Questions', 'Response details', 'Time'] as const).map((g) => {
            const inGroup = refs.filter((r) => r.group === g);
            return inGroup.length ? (
              <optgroup key={g} label={g}>
                {inGroup.map((r) => (
                  <option key={refValue(r.ref)} value={refValue(r.ref)}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </Select>
      </div>
      <div className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
        <Select id={`${uid}-o`} aria-label={`${where}: condition`} value={condition.op} onChange={(e) => onChange({ ...condition, op: e.target.value as FilterCondition['op'] })}>
          {opsForKind(kind).map((op) => (
            <option key={op} value={op}>
              {OP_LABEL[op]}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-0 max-sm:col-span-2 max-sm:row-start-3">
        {numeric ? (
          <Input
            id={`${uid}-v`}
            aria-label={`${where}: value`}
            type="number"
            inputMode="decimal"
            placeholder={kind === 'time' ? 'Year, e.g. 2026' : 'Number'}
            value={typeof condition.value === 'number' ? String(condition.value) : condition.value}
            onChange={(e) => {
              const n = e.target.value === '' ? NaN : Number(e.target.value);
              onChange({ ...condition, value: Number.isFinite(n) ? n : '' });
            }}
          />
        ) : (
          <Select id={`${uid}-v`} aria-label={`${where}: value`} value={String(condition.value)} onChange={(e) => onChange({ ...condition, value: e.target.value })}>
            <option value="">Choose…</option>
            {choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Button variant="ghost" size="small" className="max-sm:col-start-2 max-sm:row-start-1" aria-label={`Remove ${where.toLowerCase()}`} onClick={onRemove}>
        <X size={14} aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * "Filters (optional)": rows of [field] [condition] [value], joined by an AND / OR chip you click to switch, one level of groups with
 * their own chip, at most eight conditions in all. Every change gives back a whole new filter tree (lib/chartBuilder).
 */
export function FilterBuilder({ fields, scope, filters, onChange }: FilterBuilderProps) {
  const count = conditionCount(filters);
  const full = count >= MAX_CONDITIONS;
  const fresh = () => conditionFor(fields, firstFilterRef(fields));
  const items = filters?.items ?? [];

  return (
    <section aria-labelledby="chart-filters-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="chart-filters-heading" className="bg-body font-semibold text-(--text-primary)">
          Filters <span className="font-normal text-(--text-muted)">(optional)</span>
        </h3>
        {count > 0 && (
          <Button variant="ghost" size="small" onClick={() => onChange(undefined)}>
            Clear all
          </Button>
        )}
      </div>

      {count === 0 && <p className="bg-body-sm text-(--text-muted)">No filters. The chart uses all responses.</p>}

      <div className="flex flex-col">
        {items.map((item, i) => (
          <div key={i}>
            {i > 0 && filters && <JoinChip op={filters.op} where="The filters" onToggle={() => onChange(toggleOp(filters))} />}
            {isCondition(item) ? (
              <ConditionRow
                fields={fields}
                scope={scope}
                condition={item}
                index={i}
                onChange={(c) => filters && onChange(updateCondition(filters, i, c))}
                onRemove={() => filters && onChange(removeCondition(filters, i))}
              />
            ) : (
              <div role="group" aria-label={`Filter group ${i + 1}`} className="flex flex-col rounded-lg border border-(--border-default) bg-(--bg-subtle) p-3">
                {item.items.map((c, k) => (
                  <div key={k}>
                    {k > 0 && filters && <JoinChip op={item.op} where={`Filter group ${i + 1}`} onToggle={() => onChange(toggleOp(filters, i))} />}
                    <ConditionRow
                      fields={fields}
                      scope={scope}
                      condition={c}
                      index={k}
                      groupIndex={i}
                      onChange={(next) => filters && onChange(updateCondition(filters, k, next, i))}
                      onRemove={() => filters && onChange(removeCondition(filters, k, i))}
                    />
                  </div>
                ))}
                <Button variant="ghost" size="small" className="mt-2 self-start" disabled={full} onClick={() => onChange(addCondition(filters, fresh(), i))}>
                  <Plus size={14} className="mr-1" aria-hidden="true" />
                  Add filter
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={bx('flex flex-wrap items-center gap-2')}>
        <Button variant="secondary" size="small" disabled={full} onClick={() => onChange(addCondition(filters, fresh()))}>
          <Plus size={14} className="mr-1" aria-hidden="true" />
          Add filter
        </Button>
        <Button variant="secondary" size="small" disabled={full} onClick={() => onChange(addGroup(filters, fresh()))}>
          <Plus size={14} className="mr-1" aria-hidden="true" />
          Add filter group
        </Button>
        {full && <span className="bg-caption text-(--text-muted)">A chart can have at most {MAX_CONDITIONS} filters.</span>}
      </div>
    </section>
  );
}
