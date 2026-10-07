/**
 * Sprint 12 (inbox-collaboration), design.md §7.4/§16 (task 3.3). Pure date-bucketing helpers for
 * `ResponsesCalendar` — a response's calendar day is the *workspace-local* day, not the raw UTC
 * `submittedAt` date (design.md's own acceptance case: "a response at 23:30 UTC lands on the
 * correct local day for an IST workspace"). No date-library dependency — `Intl.DateTimeFormat`
 * with an explicit `timeZone` already does the conversion natively.
 */

/** UTC fetch window for `year`/`month` (0-indexed), padded a day on each side. The widest real
 * timezone offset is ±14h, so padding by a full day guarantees every response whose *local* day
 * falls inside the month is included in the raw fetch — `localDateKey` narrows it to the exact
 * day afterwards; this function only needs to avoid excluding anything. */
export function monthFetchRange(year: number, month: number): { from: string; to: string } {
  const start = new Date(Date.UTC(year, month, 1));
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(Date.UTC(year, month + 1, 1));
  end.setUTCDate(end.getUTCDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** The response's calendar day in the given IANA timezone, as 'YYYY-MM-DD'. */
export function localDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso)
  );
}

/** Every date key (Sunday-first, full weeks) needed to render a month grid covering `year`/`month`
 * (0-indexed). Calendar dates are timezone-agnostic once computed — the grid itself is just a
 * layout of 'YYYY-MM-DD' labels; `localDateKey` is what maps a response onto one of them. */
export function monthGridKeys(year: number, month: number): string[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay());

  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - lastOfMonth.getUTCDay()));

  const keys: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= gridEnd.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

// Intl still reports a few legacy IANA names that the analytics validator rejects (400 on /analytics/trends).
const LEGACY_TIMEZONES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
};

/** The browser's IANA timezone, with legacy aliases mapped to their canonical names. */
export function browserTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return LEGACY_TIMEZONES[tz] ?? tz;
}
