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

/** "Today" as 'YYYY-MM-DD' in the given IANA timezone: a late-evening visit in India is still that day, whatever UTC says. */
export function todayKey(timeZone: string, now: Date = new Date()): string {
  return localDateKey(now.toISOString(), timeZone);
}

/**
 * The fetch window for a whole visible grid (full weeks): the days of the neighbouring months shown in its first and last rows
 * get their responses too, so those cells are not half empty. Padded a day each side for the timezone offset, like
 * `monthFetchRange`; `localDateKey` narrows to the exact day afterwards.
 */
export function gridFetchRange(keys: string[]): { from: string; to: string } {
  const start = new Date(`${keys[0]}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(`${keys[keys.length - 1]}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 2);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** The clock time of an instant in the given timezone, in the viewer's own format (e.g. "2:32 PM" or "14:32"). */
export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** "Saturday, 4 October 2026" (long) or "Sat, 4 Oct" (short) for a 'YYYY-MM-DD' key. Calendar dates have no timezone. */
export function formatDayTitle(key: string, style: 'long' | 'short' = 'long'): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(
    undefined,
    style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }
  ).format(date);
}

/** The twelve month names, January first, in the viewer's language. */
export function monthNames(style: 'long' | 'short' = 'long'): string[] {
  const fmt = new Intl.DateTimeFormat(undefined, { month: style, timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(Date.UTC(2000, m, 1))));
}

/** Short weekday names, Sunday first, matching `monthGridKeys`. */
export function weekdayNames(style: 'short' | 'narrow' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: style, timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, d) => fmt.format(new Date(Date.UTC(2000, 0, 2 + d)))); // 2 Jan 2000 was a Sunday
}
