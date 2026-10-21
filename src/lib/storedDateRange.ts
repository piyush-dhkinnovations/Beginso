import { detectDateRangePreset, resolveDateRangePreset } from '@/lib/dateRange';
import type { DateRangePreset } from '@/types/analytics';

/**
 * The date range (and "compare to previous period") a person last chose on a Summary or Insights page, kept in this browser so
 * coming back to the page shows the same thing. A preset is stored as the preset, not as dates: "Last 30 days" is still the last
 * 30 days tomorrow. Only a custom range keeps its two dates.
 */
export interface StoredRange {
  preset: DateRangePreset;
  from?: string;
  to?: string;
  compare?: boolean;
}

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'all', 'custom'];
const CHANGE_EVENT = 'beginso:analytics-range';

/** One entry per form, and one per workspace for the workspace-wide Insights page. */
export const storedRangeKey = (formId: string | undefined, scope = 'personal'): string =>
  `beginso:analytics-range:${formId ?? `workspace:${scope}`}`;

const validDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

export function parseStoredRange(raw: string | null): StoredRange | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredRange> | null;
    if (!v || typeof v !== 'object' || !PRESETS.includes(v.preset as DateRangePreset)) return null;
    const compare = typeof v.compare === 'boolean' ? v.compare : undefined;
    if (v.preset === 'custom') {
      return validDate(v.from) && validDate(v.to) ? { preset: 'custom', from: v.from, to: v.to, compare } : null;
    }
    return { preset: v.preset as DateRangePreset, compare };
  } catch {
    return null;
  }
}

export const serializeStoredRange = (r: StoredRange): string => JSON.stringify(r);

/** The dates to query with. A preset is worked out from today; "all" has no bounds. */
export function storedToRange(s: StoredRange): { from?: string; to?: string; preset: DateRangePreset } {
  if (s.preset === 'custom') return { from: s.from, to: s.to, preset: 'custom' };
  return { ...resolveDateRangePreset(s.preset), preset: s.preset };
}

export function rangeToStored(range: { from?: string; to?: string }, compare?: boolean): StoredRange {
  const preset = detectDateRangePreset(range.from, range.to);
  return preset === 'custom' ? { preset, from: range.from, to: range.to, compare } : { preset, compare };
}

// ─── Browser storage (never throws: a private window or blocked storage just means "not remembered") ───

export function readStoredRangeRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredRange(key: string, value: StoredRange): void {
  const raw = serializeStoredRange(value);
  if (readStoredRangeRaw(key) === raw) return;
  try {
    window.localStorage.setItem(key, raw);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* not remembered */
  }
}

/** For useSyncExternalStore: another tab's change, and this tab's own writes. */
export function subscribeStoredRange(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
