import { describe, it, expect } from 'vitest';
import { blockingMessage, definitionOf, effectiveTitle, initialState, isDirty, shownTitle, stateFromChart, stepHint, stepLabel } from '@/components/analytics/builder/wizardState';
import type { FormField } from '@/types/form';
import type { DrillQuery } from '@/types/chartBuilder';
import type { SavedChart } from '@/types/charts';

const f = (fieldId: string, type: string, label: string, order: number, extra: Record<string, unknown> = {}) => ({ fieldId, type, label, order, deleted: false, required: false, ...extra }) as unknown as FormField;
const FIELDS = [f('plan', 'dropdown', 'Plan', 0, { options: ['Free', 'Pro'] }), f('yn', 'yes_no', 'Subscribed', 1), f('age', 'number', 'Age', 2)];

const DRILL: DrillQuery = { kind: 'drilldown', measure: { type: 'count' }, levels: [{ field: { kind: 'question', fieldId: 'yn' } }, { field: { kind: 'question', fieldId: 'plan' }, chartType: 'donut' }], display: { values: 'counts', legend: true, dataLabels: false, palette: 'ocean', interactive: false } };
const saved = (definition: SavedChart['definition'], extra: Partial<SavedChart> = {}) =>
  ({ _id: 'c1', fieldId: 'yn', type: 'auto', size: 'large', title: 'Mine', options: {}, visibility: 'workspace', position: 0, kind: 'drilldown', definition, ...extra }) as unknown as SavedChart;

describe('a drill-down in the wizard', () => {
  it('starts with two levels and builds its definition from the shared measure and filters plus the levels', () => {
    const s = { ...initialState(FIELDS), kind: 'drilldown' as const };
    expect(s.levels.map((l) => l.field)).toEqual([{ kind: 'question', fieldId: 'plan' }, { kind: 'question', fieldId: 'yn' }]);
    const d = definitionOf({ ...s, query: { ...s.query, measure: { type: 'avg', field: { kind: 'question', fieldId: 'age' } } } }) as DrillQuery;
    expect(d.kind).toBe('drilldown');
    expect(d.measure).toEqual({ type: 'avg', field: { kind: 'question', fieldId: 'age' } });
    expect(d.levels).toHaveLength(2);
    expect((d as unknown as { groupBy?: unknown }).groupBy).toBeUndefined();
  });

  it('a simple chart still saves its own query', () => {
    const s = { ...initialState(FIELDS), kind: 'simple' as const };
    expect(definitionOf(s)).toBe(s.query);
  });

  it('is edited from what it was saved with: levels, measure, display, size, sharing and the title as typed', () => {
    const s = stateFromChart(saved(DRILL), FIELDS);
    expect(s).toMatchObject({ kind: 'drilldown', title: 'Mine', titleTouched: true, size: 'large', shared: true, chartType: 'auto' });
    expect(s.levels).toEqual(DRILL.levels);
    expect(s.query.display?.palette).toBe('ocean');
    expect(definitionOf(s)).toEqual({ ...DRILL, filters: undefined });
    expect(isDirty(s, s)).toBe(false);
    expect(isDirty(s, { ...s, levels: [DRILL.levels[0], { ...DRILL.levels[1], chartType: 'bar' }] })).toBe(true);
  });

  it('an edited simple chart keeps its own chart type', () => {
    const s = stateFromChart(saved({ kind: 'simple', measure: { type: 'count' }, groupBy: { field: { kind: 'question', fieldId: 'plan' } } }, { kind: 'simple', type: 'horizontal_bar' as never }), FIELDS);
    expect(s).toMatchObject({ kind: 'simple', chartType: 'hbar' });
  });

  it('names itself from its levels until a title is typed', () => {
    const s = { ...initialState(FIELDS), kind: 'drilldown' as const };
    expect(shownTitle(FIELDS, s)).toBe('Responses by Plan, then Subscribed');
    expect(effectiveTitle(FIELDS, { ...s, title: ' Mine ', titleTouched: true })).toBe('Mine');
  });

  it('calls its third step "Drill-down levels" and hints at what each step does', () => {
    expect(stepLabel('configure', 'drilldown')).toBe('Drill-down levels');
    expect(stepLabel('configure', 'simple')).toBe('Configure chart');
    expect(stepLabel('basics', 'drilldown')).toBe('Basic information');
    expect(stepHint('configure', 'drilldown')).toBe('Add the levels');
    expect(stepHint('configure', 'simple')).toBe('Measure, sort, filter');
  });

  it('asks for the measure and the filters on step 2 (not 3), and for two levels on step 3', () => {
    const s = { ...initialState(FIELDS), kind: 'drilldown' as const };
    const sum = { ...s, query: { ...s.query, measure: { type: 'sum' as const } } };
    expect(blockingMessage('basics', FIELDS, sum)).toBe('Choose the number field to measure.');
    expect(blockingMessage('configure', FIELDS, sum)).toBeNull();
    const open = { ...s, query: { ...s.query, filters: { op: 'and' as const, items: [{ field: { kind: 'question' as const, fieldId: 'plan' }, op: 'is' as const, value: '' }] } } };
    expect(blockingMessage('basics', FIELDS, open)).toBe('Fill in every filter or remove it.');
    expect(blockingMessage('configure', FIELDS, { ...s, levels: s.levels.slice(0, 1) })).toBe('A drill-down needs at least two levels.');
    // a simple chart keeps its rules where they were
    const simple = { ...sum, kind: 'simple' as const };
    expect(blockingMessage('basics', FIELDS, simple)).toBeNull();
    expect(blockingMessage('configure', FIELDS, simple)).toBe('Choose the number field to measure.');
  });
});
