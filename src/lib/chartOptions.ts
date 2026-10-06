import type { FormField } from '@/types/form';
import type { ChartGroupBy, ChartType } from '@/types/charts';

// Sprint 14, design.md §14 / OQ-1: which chart types and groupings make sense for which field type.
// Invalid combinations are not selectable in the modal rather than rejected afterwards. The server
// re-validates (400 "invalid type for field").
const CHOICE = new Set<FormField['type']>(['dropdown', 'multiple_choice', 'checkbox']);

export const CHART_TYPE_LABEL: Record<ChartType, string> = {
  bar: 'Bar',
  donut: 'Donut',
  line: 'Line over time',
};

export const CHART_GROUP_LABEL: Record<ChartGroupBy, string> = {
  value: 'By value',
  day: 'By day',
  week: 'By week',
};

export function isSummarisableField(field: FormField): boolean {
  return !field.deleted && (CHOICE.has(field.type) || field.type === 'date');
}

export function allowedChartTypes(fieldType: FormField['type']): ChartType[] {
  if (CHOICE.has(fieldType)) return ['bar', 'donut'];
  if (fieldType === 'date') return ['line'];
  return [];
}

export function allowedGroupings(fieldType: FormField['type']): ChartGroupBy[] {
  if (CHOICE.has(fieldType)) return ['value'];
  if (fieldType === 'date') return ['day', 'week'];
  return [];
}
