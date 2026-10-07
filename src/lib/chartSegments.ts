import type { ChartSegment } from '@/components/ui/charts';

/** Plain {label, value} rows -> the interactive chart set's segments (adds share and display text). */
export function toSegments(rows: { key?: string; label: string; value: number }[], mode: 'count' | 'percent' = 'count'): ChartSegment[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r, i) => {
    const percentage = total > 0 ? (r.value / total) * 100 : 0;
    return {
      key: r.key ?? `${i}:${r.label}`,
      label: r.label,
      count: r.value,
      percentage,
      text: mode === 'percent' ? `${percentage.toFixed(percentage % 1 ? 1 : 0)}%` : r.value.toLocaleString(),
    };
  });
}
