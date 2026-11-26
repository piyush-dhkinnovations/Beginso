// Sprint 14 (B5.5 pt 1, requirements 1.4): which built-in cards a per-form dashboard shows, in
// order, chosen by the form's source-template category. Pure — no component knowledge beyond ids.
// Category values come from the real Template.category data (seedTemplates: General, Feedback, HR,
// Events, Sales, advanced; the frontend's own doc also names contact/event/hiring). Unknown or
// missing category (every pre-existing form, OQ-4) → generic.
// 'charts' is the existing responses-over-time + status-distribution pair (they share a grid row).
// 'customCharts' is the form's own saved charts (CustomChartsSection) - always placed right before
// 'questions' in every preset below, so the Per-Question Breakdown a user has to scroll past to
// reach it never grows between them (requirements.md note added when this stopped being a fixed
// trailer after the whole dashboard and became an ordered card like the others).
export type DashboardCardId = 'stats' | 'charts' | 'customCharts' | 'questions';

export type DashboardPresetId = 'generic' | 'hiring' | 'event' | 'feedback' | 'sales';

export interface DashboardPreset {
  id: DashboardPresetId;
  /** Section heading above the built-ins, only when the preset is template-specific. */
  label: string | null;
  cards: DashboardCardId[];
}

const GENERIC: DashboardPreset = { id: 'generic', label: null, cards: ['stats', 'charts', 'customCharts', 'questions'] };

const PRESETS: Record<Exclude<DashboardPresetId, 'generic'>, DashboardPreset> = {
  // Starting orders - product can tune these; the point is the ordering lives in one pure map.
  // Hiring: who applied and how (answers) before the volume curve.
  hiring: { id: 'hiring', label: 'Hiring dashboard', cards: ['stats', 'customCharts', 'questions', 'charts'] },
  // Events: sign-up volume over time is the headline.
  event: { id: 'event', label: 'Event dashboard', cards: ['charts', 'stats', 'customCharts', 'questions'] },
  // Feedback: the answer breakdown is the headline.
  feedback: { id: 'feedback', label: 'Feedback dashboard', cards: ['stats', 'customCharts', 'questions', 'charts'] },
  sales: { id: 'sales', label: 'Sales dashboard', cards: ['stats', 'charts', 'customCharts', 'questions'] },
};

const CATEGORY_TO_PRESET: Record<string, Exclude<DashboardPresetId, 'generic'>> = {
  hiring: 'hiring',
  hr: 'hiring',
  event: 'event',
  events: 'event',
  feedback: 'feedback',
  sales: 'sales',
};

export function getDashboardPreset(templateCategory: string | null | undefined): DashboardPreset {
  const key = templateCategory?.trim().toLowerCase();
  const id = key ? CATEGORY_TO_PRESET[key] : undefined;
  return id ? PRESETS[id] : GENERIC;
}
