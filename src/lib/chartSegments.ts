import type { ChartSegment } from '@/components/ui/charts';

/** Plain {label, value} rows -> the interactive chart set's segments (adds share and display text). */
export function toSegments(rows: { key?: string; label: string; axisLabel?: string; value: number }[], mode: 'count' | 'percent' = 'count'): ChartSegment[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r, i) => {
    const percentage = total > 0 ? (r.value / total) * 100 : 0;
    return {
      key: r.key ?? `${i}:${r.label}`,
      label: r.label,
      ...(r.axisLabel ? { axisLabel: r.axisLabel } : {}),
      count: r.value,
      percentage,
      text: mode === 'percent' ? `${percentage.toFixed(percentage % 1 ? 1 : 0)}%` : r.value.toLocaleString(),
    };
  });
}

/** Minimum-data rule: below this many data points a trend line, delta or percentage ring says nothing true. */
export const MIN_TREND_POINTS = 10;
export const NOT_ENOUGH_DATA = 'Not enough data to show a trend yet.';
