import { describe, it, expect } from 'vitest';
import {
  addCondition,
  addGroup,
  autoChartType,
  chartTypeChoices,
  chartTypeOptionList,
  conditionCount,
  defaultQuery,
  defaultLevels,
  describeFilters,
  filtersComplete,
  generateTitle,
  groupableFields,
  isDrill,
  kindOfRef,
  levelAsSimple,
  levelFieldChoices,
  levelFor,
  nextLevelField,
  numericFields,
  optionCountOf,
  pathOf,
  percentAvailable,
  refFromValue,
  refValue,
  removeCondition,
  resolveChartType,
  serialiseChartFilter,
  toggleOp,
  updateCondition,
  FIELD_TAG,
  filterableRefs,
  kindOfFieldType,
  naturalSortLabel,
} from '@/lib/chartBuilder';
import type { FormField } from '@/types/form';
import type { ChartQuery, DrillQuery, FilterCondition, FilterGroup, QueryEntry } from '@/types/chartBuilder';

const f = (fieldId: string, type: string, label: string, order: number, extra: Record<string, unknown> = {}) => ({ fieldId, type, label, order, deleted: false, required: false, ...extra }) as unknown as FormField;
const FIELDS = [
  f('name', 'short_text', 'Name', 0),
  f('plan', 'dropdown', 'Plan', 1, { options: ['Free', 'Pro', 'Team'] }),
  f('age', 'number', 'Age', 2),
  f('rate', 'rating', 'Rating', 3),
  f('when', 'date', 'Start date', 4),
  f('sig', 'signature', 'Signed', 5),
  f('gone', 'dropdown', 'Gone', 6, { options: ['a'], deleted: true }),
  f('yn', 'yes_no', 'Subscribed', 7),
];
const cond = (fieldId: string, op: FilterCondition['op'], value: string | number): FilterCondition => ({ field: { kind: 'question', fieldId }, op, value });

describe('what can be charted', () => {
  it('offers choice, number, rating, date and yes / no questions in the form order; never text, signatures or deleted ones', () => {
    expect(groupableFields(FIELDS).map((x) => x.fieldId)).toEqual(['plan', 'age', 'rate', 'when', 'yn']);
  });
  it('offers only number and rating for a sum, average, minimum or maximum', () => {
    expect(numericFields(FIELDS).map((x) => x.fieldId)).toEqual(['age', 'rate']);
  });
  it('knows what kind a reference is, and how many options a choice has', () => {
    expect(kindOfRef(FIELDS, { kind: 'question', fieldId: 'plan' })).toBe('choice');
    expect(kindOfRef(FIELDS, { kind: 'question', fieldId: 'yn' })).toBe('choice');
    expect(kindOfRef(FIELDS, { kind: 'question', fieldId: 'name' })).toBeUndefined();
    expect(kindOfRef(FIELDS, { kind: 'system', key: 'submittedAt' })).toBe('time');
    expect(kindOfRef(FIELDS, { kind: 'system', key: 'stage' })).toBe('stage');
    expect(optionCountOf(FIELDS, { kind: 'question', fieldId: 'plan' })).toBe(3);
    expect(optionCountOf(FIELDS, { kind: 'question', fieldId: 'yn' })).toBe(2);
    expect(optionCountOf(FIELDS, { kind: 'question', fieldId: 'age' })).toBeNull();
  });
  it('turns a reference into a select value and back', () => {
    expect(refFromValue(refValue({ kind: 'question', fieldId: 'plan' }))).toEqual({ kind: 'question', fieldId: 'plan' });
    expect(refFromValue(refValue({ kind: 'system', key: 'tags' }))).toEqual({ kind: 'system', key: 'tags' });
  });
});

describe('the automatic chart type', () => {
  it.each([
    ['a date', 'date', 'count', null, 'line'],
    ['the submitted date', 'time', 'count', null, 'line'],
    ['a number', 'number', 'count', null, 'bar'],
    ['a rating', 'rating', 'avg', null, 'bar'],
    ['a choice with up to five options', 'choice', 'count', 5, 'donut'],
    ['a choice with six options', 'choice', 'count', 6, 'bar'],
    ['a choice summed', 'choice', 'sum', 3, 'donut'],
    ['a choice averaged', 'choice', 'avg', 3, 'bar'],
    ['a stage', 'stage', 'count', null, 'bar'],
  ] as const)('%s', (_name, kind, measure, options, expected) => {
    expect(autoChartType(kind, measure, options)).toBe(expected);
  });

  it('disables a type that does not fit, with a plain reason', () => {
    const forChoice = chartTypeChoices('choice', 'count');
    expect(forChoice.find((c) => c.type === 'line')).toMatchObject({ enabled: false, reason: 'Line charts need a date.' });
    expect(forChoice.find((c) => c.type === 'donut')?.enabled).toBe(true);
    const forAverage = chartTypeChoices('choice', 'avg');
    expect(forAverage.find((c) => c.type === 'donut')).toMatchObject({ enabled: false, reason: 'Donuts show parts of a whole.' });
    const forDate = chartTypeChoices('date', 'count');
    expect(forDate.find((c) => c.type === 'line')?.enabled).toBe(true);
    expect(forDate.find((c) => c.type === 'donut')?.enabled).toBe(false);
  });

  it('keeps a chosen type while it fits and falls back to automatic when the field or aggregation changed under it', () => {
    expect(resolveChartType('hbar', 'choice', 'count', 3)).toBe('hbar');
    expect(resolveChartType('line', 'choice', 'count', 3)).toBe('donut'); // line needs a date: automatic wins
    expect(resolveChartType('donut', 'choice', 'avg', 3)).toBe('bar');
    expect(resolveChartType('auto', 'date', 'count', null)).toBe('line');
  });

  it('percentages only for count and sum', () => {
    expect(percentAvailable('count')).toBe(true);
    expect(percentAvailable('sum')).toBe(true);
    expect(percentAvailable('avg')).toBe(false);
    expect(percentAvailable('min')).toBe(false);
  });
});

describe('defaults and titles', () => {
  it('starts on the first choice question, counted, with nothing to fill in', () => {
    const q = defaultQuery(FIELDS);
    expect(q.groupBy.field).toEqual({ kind: 'question', fieldId: 'plan' });
    expect(q.measure).toEqual({ type: 'count' });
    expect(q.groupBy.bucket).toBeUndefined();
    expect(generateTitle(FIELDS, q)).toBe('Responses by Plan');
  });
  it('falls back to the submitted date, by month, when no question can be charted', () => {
    const q = defaultQuery([f('name', 'short_text', 'Name', 0)]);
    expect(q.groupBy).toEqual({ field: { kind: 'system', key: 'submittedAt' }, bucket: 'month' });
    expect(generateTitle([], q)).toBe('Responses by month');
  });
  it('names an aggregation, a date question and the filters in plain words', () => {
    const avg: ChartQuery = { kind: 'simple', measure: { type: 'avg', field: { kind: 'question', fieldId: 'age' } }, groupBy: { field: { kind: 'question', fieldId: 'plan' } } };
    expect(generateTitle(FIELDS, avg)).toBe('Average Age by Plan');
    const date: ChartQuery = { kind: 'simple', measure: { type: 'count' }, groupBy: { field: { kind: 'question', fieldId: 'when' }, bucket: 'year' } };
    expect(generateTitle(FIELDS, date)).toBe('Responses by Start date (year)');
    const filtered: ChartQuery = { ...avg, measure: { type: 'count' }, filters: { op: 'and', items: [cond('age', 'gt', 25), cond('plan', 'is', 'Pro')] } };
    expect(generateTitle(FIELDS, filtered)).toBe('Responses by Plan (Age > 25, Plan = Pro)');
  });
  it('keeps a title within 80 characters', () => {
    const long = f('l', 'dropdown', 'x'.repeat(200), 9, { options: ['a'] });
    expect(generateTitle([long], defaultQuery([long])).length).toBeLessThanOrEqual(80);
  });
});

describe('the filter tree', () => {
  const a = cond('age', 'gt', 25);
  const b = cond('plan', 'is', 'Pro');
  const c = cond('rate', 'gte', 4);

  it('adds conditions and groups, and counts every condition', () => {
    let g = addCondition(undefined, a);
    g = addCondition(g, b);
    g = addGroup(g, c);
    expect(conditionCount(g)).toBe(3);
    expect(g.items).toHaveLength(3);
    g = addCondition(g, a, 2); // into the group
    expect(conditionCount(g)).toBe(4);
  });

  it('never goes past eight conditions', () => {
    let g: FilterGroup | undefined;
    for (let i = 0; i < 12; i++) g = addCondition(g, a);
    expect(conditionCount(g)).toBe(8);
    expect(conditionCount(addGroup(g, a))).toBe(8);
  });

  it('switches AND to OR for the list and for one group, independently', () => {
    const g = toggleOp(addGroup(addCondition(undefined, a), b));
    expect(g.op).toBe('or');
    expect((g.items[1] as { op: string }).op).toBe('and');
    const h = toggleOp(g, 1);
    expect(h.op).toBe('or');
    expect((h.items[1] as { op: string }).op).toBe('or');
  });

  it('updates one condition in the list or in a group', () => {
    let g = addGroup(addCondition(undefined, a), b);
    g = updateCondition(g, 0, cond('age', 'lt', 10));
    expect((g.items[0] as FilterCondition).op).toBe('lt');
    g = updateCondition(g, 0, c, 1);
    expect(((g.items[1] as { items: FilterCondition[] }).items[0] as FilterCondition).field).toEqual(c.field);
  });

  it('removes a condition; a group that loses its last condition disappears; an empty tree is gone', () => {
    let g = addGroup(addCondition(undefined, a), b);
    g = removeCondition(g, 0, 1)!; // the only condition of the group
    expect(g.items).toHaveLength(1);
    expect(removeCondition(g, 0)).toBeUndefined();
  });

  it('says which filters are still missing a value', () => {
    expect(filtersComplete(undefined)).toBe(true);
    expect(filtersComplete(addCondition(undefined, a))).toBe(true);
    expect(filtersComplete(addCondition(undefined, cond('plan', 'is', '')))).toBe(false);
    expect(filtersComplete(addGroup(undefined, cond('plan', 'is', '')))).toBe(false);
    expect(filtersComplete(addCondition(undefined, cond('age', 'gt', Number.NaN)))).toBe(false);
  });

  it('describes filters in words: commas for AND, "or" for OR, brackets for a group', () => {
    expect(describeFilters(FIELDS, undefined)).toBe('');
    expect(describeFilters(FIELDS, { op: 'and', items: [a, b] })).toBe('Age > 25, Plan = Pro');
    expect(describeFilters(FIELDS, { op: 'or', items: [a, b] })).toBe('Age > 25 or Plan = Pro');
    expect(describeFilters(FIELDS, { op: 'and', items: [a, { op: 'or', items: [b, cond('plan', 'is_not', 'Free')] }] })).toBe('Age > 25, (Plan = Pro or Plan ≠ Free)');
    expect(describeFilters(FIELDS, { op: 'and', items: [b] }, (x) => `«${x.value}»`)).toBe('Plan = «Pro»');
  });
});

describe('the link to the Responses', () => {
  it('carries the chart\'s filters and the group that was clicked, but not how the chart looks', () => {
    const q: ChartQuery = { ...defaultQuery(FIELDS), filters: { op: 'and', items: [cond('age', 'gt', 25)] } };
    const parsed = JSON.parse(serialiseChartFilter(q, { key: 'Pro' }));
    expect(parsed.definition.display).toBeUndefined();
    expect(parsed.definition.filters.items[0].value).toBe(25);
    expect(parsed.focus).toEqual({ key: 'Pro' });
    expect(JSON.parse(serialiseChartFilter(q)).focus).toBeUndefined();
  });
});

describe('drill-down charts', () => {
  const drill: DrillQuery = { kind: 'drilldown', measure: { type: 'count' }, levels: [{ field: { kind: 'question', fieldId: 'plan' } }, { field: { kind: 'question', fieldId: 'yn' } }, { field: { kind: 'question', fieldId: 'when' }, bucket: 'year' }] };
  const entry = (key: string, extra: Record<string, unknown> = {}): QueryEntry => ({ key, label: key, value: 1, n: 1, share: 1, focus: { key, ...extra } });

  it('starts from the first two choice questions, then any other question, then the response details', () => {
    expect(defaultLevels(FIELDS).map((l) => (l.field as { fieldId: string }).fieldId)).toEqual(['plan', 'yn']);
    const numbersOnly = [f('age', 'number', 'Age', 0), f('when', 'date', 'Start date', 1)];
    expect(defaultLevels(numbersOnly)).toEqual([{ field: { kind: 'question', fieldId: 'age' } }, { field: { kind: 'question', fieldId: 'when' }, bucket: 'month' }]);
    expect(defaultLevels([]).map((l) => l.field)).toEqual([{ kind: 'system', key: 'stage' }, { kind: 'system', key: 'tags' }]);
  });

  it('gives a date level a grouping, and nothing else one', () => {
    expect(levelFor(FIELDS, { kind: 'question', fieldId: 'when' })).toEqual({ field: { kind: 'question', fieldId: 'when' }, bucket: 'month' });
    expect(levelFor(FIELDS, { kind: 'system', key: 'submittedAt' }).bucket).toBe('month');
    expect(levelFor(FIELDS, { kind: 'question', fieldId: 'plan' }).bucket).toBeUndefined();
  });

  it('offers a level every field the other levels do not use, and Add level the first of them', () => {
    const levels = drill.levels.slice(0, 2);
    const offered = levelFieldChoices(FIELDS, levels, 0).map((c) => c.label);
    expect(offered).toContain('Plan'); // its own field stays
    expect(offered).not.toContain('Subscribed'); // another level's does not
    expect(offered).toEqual(expect.arrayContaining(['Age', 'Rating', 'Response stage', 'Submitted date']));
    expect(nextLevelField(FIELDS, levels)).toEqual({ kind: 'question', fieldId: 'age' });
    const all = [...groupableFields(FIELDS).map((x) => levelFor(FIELDS, { kind: 'question', fieldId: x.fieldId })), ...(['stage', 'assignee', 'tags', 'submittedAt'] as const).map((key) => levelFor(FIELDS, { kind: 'system', key }))];
    expect(nextLevelField(FIELDS, all)).toBeUndefined();
  });

  it('names a drill-down by its levels, a date as "date", and keeps the measure and the filters in the words', () => {
    expect(generateTitle(FIELDS, drill)).toBe('Responses by Plan, then Subscribed, then Start date');
    expect(generateTitle(FIELDS, { ...drill, measure: { type: 'avg', field: { kind: 'question', fieldId: 'age' } }, levels: drill.levels.slice(0, 2), filters: { op: 'and', items: [cond('rate', 'gte', 4)] } })).toBe('Average Age by Plan, then Subscribed (Rating ≥ 4)');
    expect(generateTitle(FIELDS, { ...drill, levels: [{ field: { kind: 'system', key: 'submittedAt' }, bucket: 'month' }, drill.levels[0]] })).toBe('Responses by date, then Plan');
    expect(generateTitle(FIELDS, drill).length).toBeLessThanOrEqual(80);
  });

  it('a long drill-down title is never cut in half: it drops the "then"s, then the last names ("and 2 more")', () => {
    const q = (...labels: string[]) => ({ fields: labels.map((label, i) => ({ fieldId: `l${i}`, type: 'dropdown', label, order: i, deleted: false, required: false, options: ['a'] }) as unknown as FormField) });
    const four = q('STATUS', 'Categories', 'Status of the Film', 'Response stage').fields;
    const levels4 = four.map((f) => ({ field: { kind: 'question' as const, fieldId: f.fieldId } }));
    expect(generateTitle(four, { ...drill, levels: levels4 })).toBe('Responses by STATUS, Categories, Status of the Film, Response stage');
    const wide = q('A very long question name number one', 'A very long question name number two', 'A very long question name number three').fields;
    const t = generateTitle(wide, { ...drill, levels: wide.map((f) => ({ field: { kind: 'question' as const, fieldId: f.fieldId } })) });
    expect(t).toBe('Responses by A very long question name number one and 2 more');
    expect(t.length).toBeLessThanOrEqual(80);
  });

  it('knows a drill-down from a simple chart, and what one level counts', () => {
    expect(isDrill(drill)).toBe(true);
    expect(isDrill(defaultQuery(FIELDS))).toBe(false);
    expect(isDrill(null)).toBe(false);
    const level = levelAsSimple({ ...drill, filters: { op: 'and', items: [cond('age', 'gt', 1)] } }, 2);
    expect(level).toMatchObject({ kind: 'simple', measure: { type: 'count' }, groupBy: { field: { kind: 'question', fieldId: 'when' }, bucket: 'year' }, sort: null });
    expect(level.filters?.items).toHaveLength(1);
  });

  it('sends the clicked parts to the server as level + focus, and into the Responses link with the group', () => {
    const steps = [{ level: 0, entry: entry('Pro') }, { level: 1, entry: entry('18', { lo: 18, hi: 28 }) }];
    expect(pathOf(steps)).toEqual([{ level: 0, key: 'Pro' }, { level: 1, key: '18', lo: 18, hi: 28 }]);
    const parsed = JSON.parse(serialiseChartFilter(drill, { key: 'Yes' }, pathOf(steps)));
    expect(parsed.definition.kind).toBe('drilldown');
    expect(parsed.path).toHaveLength(2);
    expect(parsed.focus).toEqual({ key: 'Yes' });
    expect(JSON.parse(serialiseChartFilter(drill, undefined, [])).path).toBeUndefined();
  });

  it('lists the chart types a level can draw, "Automatic" first and named for the field', () => {
    const options = chartTypeOptionList('time', 'count', null);
    expect(options[0]).toEqual({ value: 'auto', label: 'Automatic: Line chart', disabled: false });
    expect(options.find((o) => o.value === 'donut')?.disabled).toBe(true);
    expect(chartTypeOptionList('choice', 'count', 3)[0].label).toBe('Automatic: Donut chart');
    expect(chartTypeOptionList('choice', 'avg', 3).find((o) => o.value === 'donut')?.disabled).toBe(true);
  });
});

describe('Time and Date & time questions', () => {
  const MORE = [f('t', 'time', 'Preferred time', 0), f('dt', 'datetime', 'Booking', 1), f('txt', 'short_text', 'Notes', 2), f('addr', 'address', 'Address', 3), f('plan', 'dropdown', 'Plan', 4, { options: ['a', 'b'] })];

  it('are offered to group by (the free-text ones still are not), and tagged for what they are', () => {
    expect(groupableFields(MORE).map((x) => x.fieldId)).toEqual(['t', 'dt', 'plan']);
    expect(kindOfFieldType('time')).toBe('hour');
    expect(kindOfFieldType('datetime')).toBe('date');
    expect(FIELD_TAG.time).toBe('Time');
    expect(FIELD_TAG.datetime).toBe('Date & time');
  });

  it('a date and time is grouped like a date (by month to start, drawn as a line); a time of day by the hour, drawn as columns, with no date grouping', () => {
    expect(levelFor(MORE, { kind: 'question', fieldId: 'dt' }).bucket).toBe('month');
    expect(levelFor(MORE, { kind: 'question', fieldId: 'dt' })).toMatchObject({ bucket: 'month' });
    expect(levelFor(MORE, { kind: 'question', fieldId: 't' }).bucket).toBeUndefined();
    expect(autoChartType('date', 'count', null)).toBe('line');
    expect(autoChartType('hour', 'count', null)).toBe('bar');
    expect(naturalSortLabel('hour')).toBe('Earliest hour first');
  });

  it('are grouped, not filtered: a filter row cannot pick them', () => {
    const picked = filterableRefs(MORE, false).filter((r) => r.group === 'Questions').map((r) => (r.ref.kind === 'question' ? r.ref.fieldId : ''));
    expect(picked).toEqual(['plan']);
  });
});
