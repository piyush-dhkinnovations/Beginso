import type { DateGranularity } from '@/types/charts';

/** "View all in Responses" URL for a chart segment. Personal -> /responses, workspace -> /w/<slug>/inbox.
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
  const base = a.scope === 'personal' ? '/responses' : `/w/${a.scope}/inbox`;
  return `${base}?${p.toString()}`;
}
