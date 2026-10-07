import type { AppNotification } from '@/types/notification';

export type NotificationGroupLabel = 'Today' | 'This week' | 'Earlier';

export interface NotificationGroup {
  label: NotificationGroupLabel;
  items: AppNotification[];
}

// Calendar day number (UTC-epoch days) of `date` as seen in `timeZone`.
function dayNumber(date: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  }
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000);
}

/** Groups newest-first notifications into Today / This week (last 7 calendar days) / Earlier, in the
 * workspace timezone (design.md §7). Empty groups are omitted; input order is preserved. */
export function groupNotifications(items: AppNotification[], timeZone: string, now: Date = new Date()): NotificationGroup[] {
  const today = dayNumber(now, timeZone);
  const buckets: Record<NotificationGroupLabel, AppNotification[]> = { Today: [], 'This week': [], Earlier: [] };
  for (const item of items) {
    const created = new Date(item.createdAt);
    const age = Number.isNaN(created.getTime()) ? Infinity : today - dayNumber(created, timeZone);
    buckets[age <= 0 ? 'Today' : age < 7 ? 'This week' : 'Earlier'].push(item);
  }
  return (['Today', 'This week', 'Earlier'] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, items: buckets[label] }));
}
