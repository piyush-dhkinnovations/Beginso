import type { FormField } from '@/types/form';
import type { ChartSegment } from '@/components/ui/charts';
import type {
  AnyChartQuery,
  Bucket,
  BuilderChartType,
  ChartDisplay,
  ChartQuery,
  DrillLevel,
  DrillQuery,
  FieldRef,
  FilterCondition,
  FilterGroup,
  GroupKind,
  InnerGroup,
  MeasureType,
  PathStep,
  QueryEntry,
  QueryResult,
  SortKey,
  SystemKey,
} from '@/types/chartBuilder';

// The rules of the chart builder, kept apart from the screens so they can be tested on their own.

// ── what can be charted ──────────────────────────────────────────────────────

const KIND_BY_TYPE: Record<string, GroupKind> = {
  dropdown: 'choice',
  multiple_choice: 'choice',
  checkbox: 'choice',
  yes_no: 'choice',
  number: 'number',
  rating: 'rating',
  date: 'date',
};

/** The small read-only tag shown beside a field in the "Group by field" select. */
export const FIELD_TAG: Record<string, string> = {
  dropdown: 'Dropdown',
  multiple_choice: 'Multiple choice',
  checkbox: 'Checkboxes',
  yes_no: 'Yes / No',
  number: 'Number',
  rating: 'Rating',
  date: 'Date',
};

export const SYSTEM_FIELDS: { key: SystemKey; label: string; tag: string; group: 'Response details' | 'Time' }[] = [
  { key: 'stage', label: 'Response stage', tag: 'Stage', group: 'Response details' },
  { key: 'assignee', label: 'Assignee', tag: 'Person', group: 'Response details' },
  { key: 'tags', label: 'Tags', tag: 'Tags', group: 'Response details' },
  { key: 'submittedAt', label: 'Submitted date', tag: 'Date', group: 'Time' },
];

export const kindOfFieldType = (type: string): GroupKind | undefined => KIND_BY_TYPE[type];

const live = (fields: readonly FormField[] | undefined) =>
  [...(fields ?? [])].filter((f) => !f.deleted).sort((a, b) => a.order - b.order);

/** Questions a chart can group by (in the form's own order). Short text, long text, files and signatures are not offered. */
export const groupableFields = (fields: readonly FormField[] | undefined): FormField[] => live(fields).filter((f) => kindOfFieldType(f.type));
/** Questions a sum, average, minimum or maximum can use. */
export const numericFields = (fields: readonly FormField[] | undefined): FormField[] => live(fields).filter((f) => f.type === 'number' || f.type === 'rating');

export const refValue = (ref: FieldRef): string => (ref.kind === 'question' ? `q:${ref.fieldId}` : `s:${ref.key}`);
export const refFromValue = (value: string): FieldRef => (value.startsWith('s:') ? { kind: 'system', key: value.slice(2) as SystemKey } : { kind: 'question', fieldId: value.slice(2) });
export const sameRef = (a: FieldRef, b: FieldRef): boolean => refValue(a) === refValue(b);

export const kindOfRef = (fields: readonly FormField[] | undefined, ref: FieldRef): GroupKind | undefined => {
  if (ref.kind === 'system') return ref.key === 'submittedAt' ? 'time' : (ref.key as GroupKind);
  const f = live(fields).find((x) => x.fieldId === ref.fieldId);
  return f ? kindOfFieldType(f.type) : undefined;
};
export const isTimeKind = (k: GroupKind | undefined): boolean => k === 'date' || k === 'time';

export const labelOfRef = (fields: readonly FormField[] | undefined, ref: FieldRef): string => {
  if (ref.kind === 'system') return SYSTEM_FIELDS.find((s) => s.key === ref.key)?.label ?? ref.key;
  return live(fields).find((f) => f.fieldId === ref.fieldId)?.label || 'Untitled question';
};

export const optionCountOf = (fields: readonly FormField[] | undefined, ref: FieldRef): number | null => {
  if (ref.kind !== 'question') return null;
  const f = live(fields).find((x) => x.fieldId === ref.fieldId);
  if (!f) return null;
  if (f.type === 'yes_no') return 2;
  const options = (f as { options?: unknown }).options;
  return Array.isArray(options) ? options.length : null;
};

// ── aggregation ──────────────────────────────────────────────────────────────

export const MEASURE_LABEL: Record<MeasureType, string> = {
  count: 'Count of responses',
  sum: 'Sum',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
};

/** Percentages are offered for Count and Sum only (an average of percentages says nothing). */
export const percentAvailable = (m: MeasureType): boolean => m === 'count' || m === 'sum';

// ── chart type ───────────────────────────────────────────────────────────────

export const CHART_TYPE_NAME: Record<Exclude<BuilderChartType, 'auto'>, string> = {
  bar: 'Column chart',
  hbar: 'Bar chart',
  donut: 'Donut chart',
  line: 'Line chart',
};

/**
 * The chart type picked for "Automatic": a date -> line; a number or rating -> columns; a choice with up to five options, counted or
 * summed -> donut; anything else -> bars.
 */
export function autoChartType(kind: GroupKind | undefined, measure: MeasureType, optionCount: number | null): Exclude<BuilderChartType, 'auto'> {
  if (isTimeKind(kind)) return 'line';
  if (kind === 'number' || kind === 'rating') return 'bar';
  if (kind === 'choice' && optionCount !== null && optionCount <= 5 && (measure === 'count' || measure === 'sum')) return 'donut';
  return 'bar';
}

export interface TypeChoice {
  type: Exclude<BuilderChartType, 'auto'>;
  enabled: boolean;
  /** Why it is not offered, in a plain sentence. */
  reason?: string;
}

/** Every type with whether it fits this field and aggregation. */
export function chartTypeChoices(kind: GroupKind | undefined, measure: MeasureType): TypeChoice[] {
  const wholes = measure === 'count' || measure === 'sum';
  return [
    { type: 'bar', enabled: true },
    { type: 'hbar', enabled: true },
    { type: 'donut', enabled: wholes && !isTimeKind(kind), reason: wholes ? 'Donuts show parts of a whole, not dates.' : 'Donuts show parts of a whole.' },
    { type: 'line', enabled: isTimeKind(kind), reason: 'Line charts need a date.' },
  ].map((c) => (c.enabled ? { type: c.type, enabled: true } : c)) as TypeChoice[];
}

/** "Automatic: Donut chart" first, then every type; one that does not fit is listed with why, and cannot be picked. */
export function chartTypeOptionList(kind: GroupKind | undefined, measure: MeasureType, optionCount: number | null): { value: BuilderChartType; label: string; disabled: boolean }[] {
  const auto = autoChartType(kind, measure, optionCount);
  return [
    { value: 'auto', label: `Automatic: ${CHART_TYPE_NAME[auto]}`, disabled: false },
    ...chartTypeChoices(kind, measure).map((c) => ({
      value: c.type as BuilderChartType,
      label: c.enabled ? CHART_TYPE_NAME[c.type] : `${CHART_TYPE_NAME[c.type]} (${(c.reason ?? '').replace(/\.$/, '').toLowerCase()})`,
      disabled: !c.enabled,
    })),
  ];
}

/** The type actually drawn: the chosen one when it still fits, otherwise the automatic one (the field or aggregation changed under it). */
export function resolveChartType(chosen: BuilderChartType, kind: GroupKind | undefined, measure: MeasureType, optionCount: number | null): Exclude<BuilderChartType, 'auto'> {
  if (chosen !== 'auto' && chartTypeChoices(kind, measure).find((c) => c.type === chosen)?.enabled) return chosen;
  return autoChartType(kind, measure, optionCount);
}

// ── sorting ──────────────────────────────────────────────────────────────────

export const SORT_LABEL: Record<Exclude<SortKey, 'natural'>, string> = {
  value_desc: 'Value (high to low)',
  value_asc: 'Value (low to high)',
  label_asc: 'Name (A to Z)',
  label_desc: 'Name (Z to A)',
};

/** The words for the "natural" order of this field. */
export const naturalSortLabel = (kind: GroupKind | undefined): string =>
  isTimeKind(kind) ? 'Oldest first' : kind === 'number' ? 'Low to high ranges' : kind === 'rating' ? 'Low to high' : 'Question order';

// ── defaults and titles ──────────────────────────────────────────────────────

export const BUCKET_LABEL: Record<Bucket, string> = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };

export const DEFAULT_DISPLAY: ChartDisplay = { values: 'counts', legend: true, dataLabels: false, palette: 'theme', interactive: true };

/** A good first chart: the first choice question, counted. Nothing to fill in. */
export function defaultQuery(fields: readonly FormField[] | undefined): ChartQuery {
  const groupable = groupableFields(fields);
  const first = groupable.find((f) => kindOfFieldType(f.type) === 'choice') ?? groupable[0];
  const field: FieldRef = first ? { kind: 'question', fieldId: first.fieldId } : { kind: 'system', key: 'submittedAt' };
  const time = isTimeKind(kindOfRef(fields, field));
  return { kind: 'simple', measure: { type: 'count' }, groupBy: { field, ...(time ? { bucket: 'month' as const } : {}) }, display: { ...DEFAULT_DISPLAY } };
}

export const isDrill = (q: AnyChartQuery | null | undefined): q is DrillQuery => q?.kind === 'drilldown';

/** Where a drill-down starts: the first two choice questions, then any other question, then the response details. */
export function defaultLevels(fields: readonly FormField[] | undefined): DrillLevel[] {
  const groupable = groupableFields(fields);
  const questions = [...groupable.filter((f) => kindOfFieldType(f.type) === 'choice'), ...groupable.filter((f) => kindOfFieldType(f.type) !== 'choice')];
  const refs: FieldRef[] = [...questions.map((f) => ({ kind: 'question', fieldId: f.fieldId }) as FieldRef), ...(['stage', 'tags', 'assignee', 'submittedAt'] as SystemKey[]).map((key) => ({ kind: 'system', key }) as FieldRef)];
  return refs.slice(0, 2).map((field) => levelFor(fields, field));
}

/** A new level on a field: dates start grouped by month. */
export const levelFor = (fields: readonly FormField[] | undefined, field: FieldRef): DrillLevel => ({ field, ...(isTimeKind(kindOfRef(fields, field)) ? { bucket: 'month' as Bucket } : {}) });

/** The fields a level can pick: every groupable field that no other level uses. */
export function levelFieldChoices(fields: readonly FormField[] | undefined, levels: readonly DrillLevel[], index: number): { ref: FieldRef; label: string; tag: string; group: 'Questions' | 'Response details' | 'Time' }[] {
  const taken = new Set(levels.filter((_, i) => i !== index).map((l) => refValue(l.field)));
  return [
    ...groupableFields(fields).map((f) => ({ ref: { kind: 'question', fieldId: f.fieldId } as FieldRef, label: f.label || 'Untitled question', tag: FIELD_TAG[f.type] ?? '', group: 'Questions' as const })),
    ...SYSTEM_FIELDS.map((f) => ({ ref: { kind: 'system', key: f.key } as FieldRef, label: f.label, tag: f.tag, group: f.group })),
  ].filter((c) => !taken.has(refValue(c.ref)));
}

/** The first field not used by any level yet, for "Add level"; undefined when all are used. */
export const nextLevelField = (fields: readonly FormField[] | undefined, levels: readonly DrillLevel[]): FieldRef | undefined => levelFieldChoices(fields, levels, -1)[0]?.ref;

/** The simple chart one level of a drill-down is (what its groups are worked out from). */
export const levelAsSimple = (q: DrillQuery, depth: number): ChartQuery => {
  const l = q.levels[depth];
  return { kind: 'simple', measure: q.measure, groupBy: { field: l.field, ...(l.bucket ? { bucket: l.bucket } : {}) }, filters: q.filters, sort: l.sort ?? null, display: q.display };
};

/** The path the server wants, from the groups that were clicked (outermost first). */
export const pathOf = (steps: readonly { level: number; entry: QueryEntry }[]): PathStep[] => steps.map((s) => ({ level: s.level, ...s.entry.focus }));

/** "Responses by Plan", "Average Age by Plan", "Responses by month"; a drill-down: "Responses by Plan, then Subscribed". */
export function generateTitle(fields: readonly FormField[] | undefined, q: AnyChartQuery): string {
  if (isDrill(q)) {
    const m = q.measure;
    const measured = m.field ? labelOfRef(fields, m.field) : '';
    const head = m.type === 'count' ? 'Responses' : `${{ sum: 'Sum', avg: 'Average', min: 'Minimum', max: 'Maximum' }[m.type]} ${measured}`.trim();
    const filters = describeFilters(fields, q.filters);
    const names = q.levels.map((l) => (kindOfRef(fields, l.field) === 'time' ? 'date' : labelOfRef(fields, l.field)));
    return `${head} by ${names.join(', then ')}${filters ? ` (${filters})` : ''}`.slice(0, 80);
  }
  const by = labelOfRef(fields, q.groupBy.field);
  const kind = kindOfRef(fields, q.groupBy.field);
  const groupText = kind === 'time' ? BUCKET_LABEL[q.groupBy.bucket ?? 'month'].toLowerCase() : kind === 'date' ? `${by} (${(q.groupBy.bucket ?? 'month')})` : by;
  const m = q.measure;
  const measured = m.field ? labelOfRef(fields, m.field) : '';
  const head = m.type === 'count' ? 'Responses' : `${{ sum: 'Sum', avg: 'Average', min: 'Minimum', max: 'Maximum' }[m.type]} ${measured}`.trim();
  const filters = describeFilters(fields, q.filters);
  return `${head} by ${groupText}${filters ? ` (${filters})` : ''}`.slice(0, 80);
}

// ── filters ──────────────────────────────────────────────────────────────────

export const CHOICE_OP_LABEL = { is: 'is', is_not: 'is not' } as const;
export const NUMBER_OP_LABEL = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' } as const;

export const isCondition = (i: FilterCondition | InnerGroup): i is FilterCondition => 'field' in i;
export const conditionCount = (g: FilterGroup | undefined): number => (g ? g.items.reduce((n, i) => n + (isCondition(i) ? 1 : i.items.length), 0) : 0);
export const MAX_CONDITIONS = 8;

/** A condition with a value filled in is usable; the wizard blocks "Next" on any that is not. */
export const conditionComplete = (c: FilterCondition): boolean => (typeof c.value === 'number' ? Number.isFinite(c.value) : c.value !== '');
export const filtersComplete = (g: FilterGroup | undefined): boolean => !g || g.items.every((i) => (isCondition(i) ? conditionComplete(i) : i.items.every(conditionComplete)));

export type NamedValues = (c: FilterCondition) => string;

const conditionText = (fields: readonly FormField[] | undefined, c: FilterCondition, valueName?: NamedValues): string => {
  const label = labelOfRef(fields, c.field);
  const op = (c.op in CHOICE_OP_LABEL ? CHOICE_OP_LABEL[c.op as 'is' | 'is_not'] : NUMBER_OP_LABEL[c.op as keyof typeof NUMBER_OP_LABEL]) ?? c.op;
  const sign = c.op === 'is' ? '=' : c.op === 'is_not' ? '≠' : op;
  return `${label} ${sign} ${valueName ? valueName(c) : c.value}`;
};

/** "Age > 25, Event = Workshop": the filters in plain words (for the chart's title). */
export function describeFilters(fields: readonly FormField[] | undefined, g: FilterGroup | undefined, valueName?: NamedValues): string {
  if (!g || g.items.length === 0) return '';
  const joiner = g.op === 'and' ? ', ' : ' or ';
  return g.items
    .map((i) => (isCondition(i) ? conditionText(fields, i, valueName) : `(${i.items.map((c) => conditionText(fields, c, valueName)).join(i.op === 'and' ? ', ' : ' or ')})`))
    .filter(Boolean)
    .join(joiner);
}

// ── editing the filter tree (pure: each returns a new tree) ──────────────────

const EMPTY: FilterGroup = { op: 'and', items: [] };

export const addCondition = (g: FilterGroup | undefined, c: FilterCondition, groupIndex?: number): FilterGroup => {
  const base = g ?? EMPTY;
  if (conditionCount(base) >= MAX_CONDITIONS) return base;
  if (groupIndex === undefined) return { ...base, items: [...base.items, c] };
  return { ...base, items: base.items.map((i, idx) => (idx === groupIndex && !isCondition(i) ? { ...i, items: [...i.items, c] } : i)) };
};
export const addGroup = (g: FilterGroup | undefined, c: FilterCondition): FilterGroup => {
  const base = g ?? EMPTY;
  if (conditionCount(base) >= MAX_CONDITIONS) return base;
  return { ...base, items: [...base.items, { op: 'and', items: [c] }] };
};
export const updateCondition = (g: FilterGroup, index: number, c: FilterCondition, groupIndex?: number): FilterGroup => ({
  ...g,
  items: g.items.map((i, idx) => {
    if (groupIndex === undefined) return idx === index ? c : i;
    return idx === groupIndex && !isCondition(i) ? { ...i, items: i.items.map((x, k) => (k === index ? c : x)) } : i;
  }),
});
/** Removes one condition. A group that loses its last condition disappears; an empty tree becomes undefined. */
export const removeCondition = (g: FilterGroup, index: number, groupIndex?: number): FilterGroup | undefined => {
  const items = g.items
    .map((i, idx) => {
      if (groupIndex === undefined) return idx === index ? null : i;
      if (idx !== groupIndex || isCondition(i)) return i;
      const rest = i.items.filter((_, k) => k !== index);
      return rest.length ? { ...i, items: rest } : null;
    })
    .filter((i): i is FilterCondition | InnerGroup => i !== null);
  return items.length ? { ...g, items } : undefined;
};
/** AND <-> OR for the whole list (no group index) or for one group. */
export const toggleOp = (g: FilterGroup, groupIndex?: number): FilterGroup => {
  const flip = (op: 'and' | 'or') => (op === 'and' ? 'or' : 'and');
  if (groupIndex === undefined) return { ...g, op: flip(g.op) };
  return { ...g, items: g.items.map((i, idx) => (idx === groupIndex && !isCondition(i) ? { ...i, op: flip(i.op) } : i)) };
};

// ── the Responses link ───────────────────────────────────────────────────────

/** The `chart` parameter of the Responses list: this chart's filters, optionally narrowed by the parts of a drill-down already clicked (`path`) and the group that was clicked (`focus`). */
export function serialiseChartFilter(q: AnyChartQuery, focus?: { key: string; lo?: number; hi?: number }, path?: PathStep[]): string {
  const { display: _display, ...definition } = q;
  void _display;
  return JSON.stringify({ definition, ...(path?.length ? { path } : {}), ...(focus ? { focus } : {}) });
}

// ── drawing ──────────────────────────────────────────────────────────────────

export const formatFigure = (n: number): string => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));
const formatPercent = (p: number): string => `${p.toFixed(p % 1 ? 1 : 0)}`;

/** The groups of an answer as the in-house charts want them: a figure to draw, the words for the tooltip, and a share. */
export function entrySegments(result: QueryResult, mode: ChartDisplay['values'], interactive: boolean, clickHint = 'Click to see who answered'): ChartSegment[] {
  const m = result.measure.type;
  const total = result.entries.reduce((s, e) => s + e.value, 0);
  const hint = interactive ? ` · ${clickHint}` : '';
  return result.entries.map((e) => {
    const percentage = m === 'count' ? e.share * 100 : m === 'sum' && total > 0 ? (e.value / total) * 100 : 0;
    const text = mode === 'percent' && percentAvailable(m) ? `${formatPercent(percentage)}%` : formatFigure(e.value);
    const detail =
      m === 'count'
        ? `${e.n.toLocaleString()} ${e.n === 1 ? 'response' : 'responses'} (${formatPercent(percentage)}%)`
        : `${result.measure.label} ${result.measure.fieldLabel ?? ''}: ${formatFigure(e.value)}`.replace('  ', ' ');
    return { key: e.key, label: e.label, count: e.value, percentage, text, detail: `${detail}${hint}` };
  });
}

// ── what a filter row can be ─────────────────────────────────────────────────

/** The fields a filter can use: choice, number and rating questions, then the response details, then the submitted year. */
export function filterableRefs(fields: readonly FormField[] | undefined, includePeople: boolean): { ref: FieldRef; label: string; group: 'Questions' | 'Response details' | 'Time' }[] {
  const questions = groupableFields(fields)
    .filter((f) => kindOfFieldType(f.type) !== 'date')
    .map((f) => ({ ref: { kind: 'question', fieldId: f.fieldId } as FieldRef, label: f.label || 'Untitled question', group: 'Questions' as const }));
  const details = SYSTEM_FIELDS.filter((s) => s.group === 'Response details' && (includePeople || s.key === 'stage')).map((s) => ({ ref: { kind: 'system', key: s.key } as FieldRef, label: s.label, group: 'Response details' as const }));
  return [...questions, ...details, { ref: { kind: 'system', key: 'submittedAt' } as FieldRef, label: 'Submitted year', group: 'Time' as const }];
}

export const isNumericFilterKind = (k: GroupKind | undefined): boolean => k === 'number' || k === 'rating' || k === 'time';

export const OP_LABEL: Record<FilterCondition['op'], string> = {
  is: 'is',
  is_not: 'is not',
  eq: 'equals',
  neq: 'does not equal',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
};

export const opsForKind = (k: GroupKind | undefined): FilterCondition['op'][] => (isNumericFilterKind(k) ? ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'] : ['is', 'is_not']);

/** A new, still empty condition for a field: a sensible condition and no value (the wizard asks for one before it goes on). */
export const conditionFor = (fields: readonly FormField[] | undefined, ref: FieldRef): FilterCondition => {
  const kind = kindOfRef(fields, ref);
  return { field: ref, op: isNumericFilterKind(kind) ? (kind === 'time' ? 'eq' : 'gte') : 'is', value: '' };
};
export const firstFilterRef = (fields: readonly FormField[] | undefined): FieldRef => filterableRefs(fields, false)[0].ref;
