import type { DateRangePreset } from '@/types/analytics';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESET_DAYS: Record<Exclude<DateRangePreset, 'all' | 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** UTC day boundaries for a preset. `all`/`custom` have no fixed boundary — both come back undefined. */
export function resolveDateRangePreset(preset: DateRangePreset): { from?: string; to?: string } {
  if (preset === 'all' || preset === 'custom') return { from: undefined, to: undefined };

  const days = PRESET_DAYS[preset];
  const now = new Date();

  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  from.setUTCHours(0, 0, 0, 0);

  return { from: from.toISOString(), to: to.toISOString() };
}

/** Swaps `from`/`to` if inverted; throws on unparseable input rather than returning Invalid Date. */
export function normalizeDateRange(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error(`normalizeDateRange: unparseable date input (from="${from}", to="${to}")`);
  }
  return fromDate.getTime() <= toDate.getTime()
    ? { from: fromDate.toISOString(), to: toDate.toISOString() }
    : { from: toDate.toISOString(), to: fromDate.toISOString() };
}

const DAY_BUCKET_THRESHOLD_DAYS = 45;

/**
 * `day` when the range spans <= 45 days; `week` otherwise. An open-ended range (no `from`/`to`,
 * i.e. the "All time" preset) can span the form's entire history, so it defaults to `week`.
 */
export function resolveTrendBucket(from?: string, to?: string): 'day' | 'week' {
  if (!from || !to) return 'week';

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 'week';

  const spanDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / DAY_MS);
  return spanDays <= DAY_BUCKET_THRESHOLD_DAYS ? 'day' : 'week';
}
