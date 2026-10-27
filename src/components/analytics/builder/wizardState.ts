import type { FormField } from '@/types/form';
import type { AnyChartQuery, BuilderChartSize, BuilderChartType, ChartQuery, DrillLevel } from '@/types/chartBuilder';
import { defaultLevels, defaultQuery, filtersComplete, generateTitle, isDrill } from '@/lib/chartBuilder';
import type { SavedChart } from '@/types/charts';

export interface WizardState {
  /** What the person chose on the first step. */
  kind: 'simple' | 'drilldown' | null;
  title: string;
  /** False until the person types a title: until then it is generated from the field, the aggregation and the filters. */
  titleTouched: boolean;
  /** A simple chart's whole query. For a drill-down only the measure, the filters and the display count (its fields are `levels`). */
  query: ChartQuery;
  /** A drill-down's levels, outermost first. Kept (and kept valid) for a simple chart too, so switching the kind back and forth loses nothing. */
  levels: DrillLevel[];
  chartType: BuilderChartType;
  size: BuilderChartSize;
  shared: boolean;
}

/** The wizard's state for a chart that is being edited: everything it was saved with, the title as typed. */
export const stateFromChart = (c: SavedChart, fields: readonly FormField[] | undefined): WizardState => {
  const d = c.definition!;
  const common = { title: c.title, titleTouched: true, size: c.size, shared: c.visibility === 'workspace' };
  if (isDrill(d)) {
    return { ...common, kind: 'drilldown', query: { ...defaultQuery(fields), measure: d.measure, filters: d.filters, display: d.display }, levels: d.levels, chartType: 'auto' };
  }
  return { ...common, kind: 'simple', query: d, levels: defaultLevels(fields), chartType: ((c.type as string) === 'horizontal_bar' ? 'hbar' : c.type) as unknown as BuilderChartType };
};

/** What is saved and counted: a simple chart's query, or the drill-down made of the shared measure and filters plus the levels. */
export const definitionOf = (s: WizardState): AnyChartQuery =>
  s.kind === 'drilldown' ? { kind: 'drilldown', measure: s.query.measure, levels: s.levels, filters: s.query.filters, display: s.query.display } : s.query;

export const initialState = (fields: readonly FormField[] | undefined): WizardState => ({
  kind: null,
  title: '',
  titleTouched: false,
  query: defaultQuery(fields),
  levels: defaultLevels(fields),
  chartType: 'auto',
  size: 'medium',
  shared: false,
});

/** What the title box shows: exactly what was typed (spaces included), or the generated title until something is typed. */
export const shownTitle = (fields: readonly FormField[] | undefined, s: WizardState): string => (s.titleTouched ? s.title : generateTitle(fields, definitionOf(s)));

/** The title that is saved and drawn: the same, without stray spaces at the ends. */
export const effectiveTitle = (fields: readonly FormField[] | undefined, s: WizardState): string => (s.titleTouched ? s.title.trim() : generateTitle(fields, definitionOf(s)));

export const TITLE_MAX = 80;

export type StepId = 'kind' | 'basics' | 'configure' | 'save';
export const STEP_IDS: StepId[] = ['kind', 'basics', 'configure', 'save'];
export const STEP_LABELS: Record<StepId, string> = { kind: 'Chart type', basics: 'Basic information', configure: 'Configure chart', save: 'Preview & save' };
/** One line under each step in the list on the left: what it is for. */
export const STEP_HINTS: Record<StepId, string> = { kind: 'Simple or drill-down', basics: 'Name it, pick a field', configure: 'Measure, sort, filter', save: 'Look, size, sharing' };

/** The same two, for the kind of chart being built: a drill-down names it and sets the measure first, then adds its levels. */
export const stepLabel = (id: StepId, kind: WizardState['kind']): string => (kind === 'drilldown' && id === 'configure' ? 'Drill-down levels' : STEP_LABELS[id]);
export const stepHint = (id: StepId, kind: WizardState['kind']): string =>
  kind === 'drilldown' ? { kind: STEP_HINTS.kind, basics: 'Name it, measure, filter', configure: 'Add the levels', save: STEP_HINTS.save }[id] : STEP_HINTS[id];

/** The one thing stopping the person from leaving this step, in a plain sentence; null when they may go on. */
export function blockingMessage(step: StepId, fields: readonly FormField[] | undefined, s: WizardState): string | null {
  // A drill-down sets its measure and filters on the second step (its levels come next); a simple chart sets them on the third.
  const measureStep = s.kind === 'drilldown' ? 'basics' : 'configure';
  if (step === 'basics') {
    if (effectiveTitle(fields, s) === '') return 'Add a chart title to continue.';
  }
  if (step === measureStep) {
    if (s.query.measure.type !== 'count' && !s.query.measure.field) return 'Choose the number field to measure.';
    if (!filtersComplete(s.query.filters)) return 'Fill in every filter or remove it.';
  }
  if (step === 'configure' && s.kind === 'drilldown' && s.levels.length < 2) return 'A drill-down needs at least two levels.';
  return null;
}

/** Has the person changed anything from where the wizard started (the defaults, or the chart being edited)? Asks before throwing it away. */
export const isDirty = (baseline: WizardState, s: WizardState): boolean => JSON.stringify({ ...baseline, kind: null }) !== JSON.stringify({ ...s, kind: null });
