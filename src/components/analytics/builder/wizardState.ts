import type { FormField } from '@/types/form';
import type { BuilderChartSize, BuilderChartType, ChartQuery } from '@/types/chartBuilder';
import { defaultQuery, filtersComplete, generateTitle } from '@/lib/chartBuilder';
import type { SavedChart } from '@/types/charts';

export interface WizardState {
  /** What the person chose on the first step. Drill-down is not built yet. */
  kind: 'simple' | null;
  title: string;
  /** False until the person types a title: until then it is generated from the field, the aggregation and the filters. */
  titleTouched: boolean;
  query: ChartQuery;
  chartType: BuilderChartType;
  size: BuilderChartSize;
  shared: boolean;
}

/** The wizard's state for a chart that is being edited: everything it was saved with, the title as typed. */
export const stateFromChart = (c: SavedChart): WizardState => ({
  kind: 'simple',
  title: c.title,
  titleTouched: true,
  query: c.definition!,
  chartType: ((c.type as string) === 'horizontal_bar' ? 'hbar' : c.type) as unknown as BuilderChartType,
  size: c.size,
  shared: c.visibility === 'workspace',
});

export const initialState = (fields: readonly FormField[] | undefined): WizardState => ({
  kind: null,
  title: '',
  titleTouched: false,
  query: defaultQuery(fields),
  chartType: 'auto',
  size: 'medium',
  shared: false,
});

/** What the title box shows: exactly what was typed (spaces included), or the generated title until something is typed. */
export const shownTitle = (fields: readonly FormField[] | undefined, s: WizardState): string => (s.titleTouched ? s.title : generateTitle(fields, s.query));

/** The title that is saved and drawn: the same, without stray spaces at the ends. */
export const effectiveTitle = (fields: readonly FormField[] | undefined, s: WizardState): string => (s.titleTouched ? s.title.trim() : generateTitle(fields, s.query));

export const TITLE_MAX = 80;

export type StepId = 'kind' | 'basics' | 'configure' | 'save';
export const STEP_IDS: StepId[] = ['kind', 'basics', 'configure', 'save'];
export const STEP_LABELS: Record<StepId, string> = { kind: 'Chart type', basics: 'Basic information', configure: 'Configure chart', save: 'Preview & save' };
/** One line under each step in the list on the left: what it is for. */
export const STEP_HINTS: Record<StepId, string> = { kind: 'Simple or drill-down', basics: 'Name it, pick a field', configure: 'Measure, sort, filter', save: 'Look, size, sharing' };

/** The one thing stopping the person from leaving this step, in a plain sentence; null when they may go on. */
export function blockingMessage(step: StepId, fields: readonly FormField[] | undefined, s: WizardState): string | null {
  if (step === 'basics') {
    if (effectiveTitle(fields, s) === '') return 'Add a chart title to continue.';
  }
  if (step === 'configure') {
    if (s.query.measure.type !== 'count' && !s.query.measure.field) return 'Choose the number field to measure.';
    if (!filtersComplete(s.query.filters)) return 'Fill in every filter or remove it.';
  }
  return null;
}

/** Has the person changed anything from where the wizard started (the defaults, or the chart being edited)? Asks before throwing it away. */
export const isDirty = (baseline: WizardState, s: WizardState): boolean => JSON.stringify({ ...baseline, kind: null }) !== JSON.stringify({ ...s, kind: null });
