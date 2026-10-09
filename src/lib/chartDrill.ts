import type { DateGranularity } from '@/types/charts';

/** "View all in Responses" URL for a chart segment. The form's own Responses page: /forms/<id>/inbox (workspace adds ?ws=<slug>).
 * The Responses pages read field / value / granularity / from / to straight from the URL, so the link works
 * pasted into a fresh tab. `value` is the raw answer, or a date bucket: 2026-09-30 (day), 2026-W40 (week),
 * 2026-09 (month), with `granularity` naming which. No `value` = "answered this question". */
export function drillHref(a: {
  scope: string;
  formId: string;
  fieldId: string;
  value?: string;
  granularity?: DateGranularity;
  from?: string;
  to?: string;
}): string {
  const p = new URLSearchParams({ formId: a.formId, field: a.fieldId });
  if (a.value !== undefined) p.set('value', a.value);
  if (a.granularity) p.set('granularity', a.granularity);
  if (a.from) p.set('from', a.from);
  if (a.to) p.set('to', a.to);
  // Stay inside the form: its own Responses page, with ?ws= naming the workspace so the right sidebar loads.
  if (a.scope !== 'personal') p.set('ws', a.scope);
  return `/forms/${a.formId}/inbox?${p.toString()}`;
}
