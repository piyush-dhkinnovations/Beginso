import type { FormField } from '@/types/form';
import type { ChartDefinition, ChartOptions, ChartSize, ChartType, DateGranularity, FieldBucket } from '@/types/charts';

// Which chart types make sense for which field type. The drawer only ever offers the valid ones; the
// server re-validates. Rating is not a builder field type yet - it is accepted defensively so a
// future 'rating' field charts without a code change.
export type ChartFieldKind = 'choice' | 'scale' | 'date';

const KIND_BY_TYPE: Record<string, ChartFieldKind> = {
  dropdown: 'choice',
  multiple_choice: 'choice',
  checkbox: 'choice',
  rating: 'scale',
  number: 'scale',
  date: 'date',
};

export const FIELD_TYPE_LABEL: Record<string, string> = {
  dropdown: 'Dropdown',
  multiple_choice: 'Multiple choice',
  checkbox: 'Checkbox',
  rating: 'Rating',
  number: 'Number',
  date: 'Date',
};

export const CHART_TYPE_LABEL: Record<ChartType, string> = {
  pie: 'Pie',
  donut: 'Donut',
  bar: 'Bar',
  horizontal_bar: 'Horizontal bar',
  line: 'Line',
  area: 'Area',
  bar_time: 'Bar over time',
  average: 'Average',
};

export const TYPES_BY_KIND: Record<ChartFieldKind, ChartType[]> = {
  choice: ['pie', 'donut', 'bar', 'horizontal_bar'],
  scale: ['bar', 'line', 'average'],
  date: ['line', 'area', 'bar_time'],
};

export const SIZE_LABEL: Record<ChartSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
export const SIZE_FRACTION: Record<ChartSize, string> = { small: '1/3 width', medium: '1/2 width', large: 'Full width' };
export const SIZES: ChartSize[] = ['small', 'medium', 'large'];

export function fieldKind(field: Pick<FormField, 'type'>): ChartFieldKind | undefined {
  return KIND_BY_TYPE[field.type as string];
}

export function isChartableField(field: FormField): boolean {
  return !field.deleted && fieldKind(field) !== undefined;
}

export function chartableFields(fields: FormField[] | undefined): FormField[] {
  return (fields ?? []).filter(isChartableField).sort((a, b) => a.order - b.order);
}

export function allowedChartTypes(field: Pick<FormField, 'type'> | undefined): ChartType[] {
  const kind = field ? fieldKind(field) : undefined;
  return kind ? TYPES_BY_KIND[kind] : [];
}

export function isTimeType(type: ChartType): boolean {
  return type === 'line' || type === 'area' || type === 'bar_time';
}

export function defaultOptions(field: Pick<FormField, 'type'> | undefined): ChartOptions {
  // Rating / number scales must stay 1..5 - original order. Choice fields read best largest-first.
  return { valueMode: 'count', legend: true, sort: field && fieldKind(field) === 'choice' ? 'value' : 'original' };
}

/** Date buckets get coarser as the range widens. All time (no bounds) is monthly. */
export function dateGranularity(from?: string, to?: string): DateGranularity {
  if (!from || !to) return 'month';
  const days = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return 'month';
  return days <= 45 ? 'day' : days <= 200 ? 'week' : 'month';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Plain-words label of a date bucket value; falls back to the raw value for anything unexpected. */
export function bucketLabel(value: string, short = false): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return `${Number(day[3])} ${MONTHS[Number(day[2]) - 1] ?? ''}${short ? '' : ` ${day[1]}`}`;
  const week = /^(\d{4})-W(\d{2})$/.exec(value);
  if (week) return short ? `W${Number(week[2])}` : `Week ${Number(week[2])}, ${week[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) return `${MONTHS[Number(month[2]) - 1] ?? ''}${short ? ` '${month[1].slice(2)}` : ` ${month[1]}`}`;
  return value;
}

/** What one rendered segment is: shared by every chart component, the table, the CSV and the drill panel. */
export interface ChartDatum {
  key: string; // the raw `value` sent back to the server when drilling
  label: string;
  count: number;
  percentage: number;
  /** The figure to display - a count or a percentage, per options.valueMode. */
  text: string;
}

const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export function buildData(
  def: Pick<ChartDefinition, 'type' | 'options'>,
  field: FormField | undefined,
  buckets: FieldBucket[],
): ChartDatum[] {
  const time = isTimeType(def.type) && field?.type === 'date';
  const rows = buckets.filter((r) => Number.isFinite(r.count));
  if (time) rows.sort((a, b) => a.value.localeCompare(b.value));
  else if (def.options.sort === 'value') rows.sort((a, b) => b.count - a.count);
  else if (field && fieldKind(field) === 'choice' && 'options' in field) {
    const order = new Map(field.options.map((o, i) => [o, i]));
    rows.sort((a, b) => (order.get(a.value) ?? 1e9) - (order.get(b.value) ?? 1e9));
  } else {
    rows.sort((a, b) => Number(a.value) - Number(b.value) || a.value.localeCompare(b.value));
  }
  return rows.map((r) => ({
    key: r.value,
    label: field?.type === 'date' ? bucketLabel(r.value, true) : r.value,
    count: r.count,
    percentage: r.percentage,
    text: def.options.valueMode === 'percent' ? pct(r.percentage) : r.count.toLocaleString(),
  }));
}

/** Weighted mean of a rating / number distribution; null when nothing numeric was answered. */
export function averageOf(buckets: FieldBucket[]): { mean: number; n: number } | null {
  let sum = 0;
  let n = 0;
  for (const b of buckets) {
    const v = Number(b.value);
    if (Number.isFinite(v) && b.value.trim() !== '') {
      sum += v * b.count;
      n += b.count;
    }
  }
  return n > 0 ? { mean: sum / n, n } : null;
}

export function formatMean(mean: number): string {
  return (Math.round(mean * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
