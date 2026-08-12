/** Shared "vs previous period" math for Workspace Analytics' summary cards and Change column. */

// A baseline this small produces a percentage that's technically correct but practically
// meaningless (2 → 31 is "+1450%", and a workspace-wide previous total of 5 against a current
// 145 is "+2800%") — below this, there isn't enough prior-period history for a real comparison
// (per-form or aggregated across the whole workspace), so it's treated as no baseline at all.
const MIN_BASELINE_FOR_CHANGE = 10;

/** `null` when there's no previous-period baseline worth comparing against (too small, zero, or
 * incalculable) — callers render that as "—" rather than a misleading "∞%"/wildly inflated %. */
export function computeChangePercent(current: number, previous: number): number | null {
  if (previous < MIN_BASELINE_FOR_CHANGE) return null;
  return ((current - previous) / previous) * 100;
}

/** `↑ 12.0%` / `↓ 3.2%` / `—` (no change, or no baseline) — one decimal place, matching the
 * product's requested format. */
export function formatChangeLabel(percent: number | null): string {
  if (percent === null || percent === 0) return '—';
  const rounded = Math.abs(percent).toFixed(1);
  return percent > 0 ? `↑ ${rounded}%` : `↓ ${rounded}%`;
}
