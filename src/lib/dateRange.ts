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

/** Which preset (if any) an already-resolved `{from, to}` pair matches — for pill active-state. */
export function detectDateRangePreset(from?: string, to?: string): DateRangePreset {
  if (!from && !to) return 'all';
  if (!from || !to) return 'custom';
  for (const preset of ['7d', '30d', '90d'] as const) {
    const candidate = resolveDateRangePreset(preset);
    if (candidate.from === from && candidate.to === to) return preset;
  }
  return 'custom';
}

/**
 * Literal marker for "All time" inside the `?from=&to=` URL params. Deleting both params on
 * selecting "All time" would be indistinguishable, on reload, from a fresh param-less visit
 * (which defaults to "Last 30 days" per Requirement 3.2) — this sentinel keeps "All time"
 * round-trippable through the URL (Requirement 3.6) while staying inside the two documented params.
 */
export const ALL_TIME_SENTINEL = 'all';

export interface EffectiveDateRange {
  from?: string;
  to?: string;
  preset: DateRangePreset;
}

/** Resolves the `?from=&to=` URL search-param strings (or `null` when absent) into the values a
 * page actually queries with, applying the default-preset and "All time" sentinel rules above. */
export function resolveEffectiveDateRange(from: string | null, to: string | null): EffectiveDateRange {
  if (from === null && to === null) {
    return { ...resolveDateRangePreset('30d'), preset: '30d' };
  }
  if (from === ALL_TIME_SENTINEL || to === ALL_TIME_SENTINEL) {
    return { from: undefined, to: undefined, preset: 'all' };
  }
  const resolvedFrom = from ?? undefined;
  const resolvedTo = to ?? undefined;
  return { from: resolvedFrom, to: resolvedTo, preset: detectDateRangePreset(resolvedFrom, resolvedTo) };
}
