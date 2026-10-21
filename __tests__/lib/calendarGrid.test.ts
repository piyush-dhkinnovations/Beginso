import { describe, expect, it } from 'vitest';
import { formatDayTitle, formatTimeInZone, gridFetchRange, monthGridKeys, monthNames, todayKey, weekdayNames } from '@/lib/calendarDates';

describe('todayKey', () => {
  it('is the day in the timezone asked for, not the UTC day', () => {
    const lateUtc = new Date('2026-09-15T23:30:00.000Z');
    expect(todayKey('UTC', lateUtc)).toBe('2026-09-15');
    expect(todayKey('Asia/Kolkata', lateUtc)).toBe('2026-09-16'); // already tomorrow in India
    expect(todayKey('America/Los_Angeles', new Date('2026-09-16T02:00:00.000Z'))).toBe('2026-09-15');
  });
});

describe('gridFetchRange', () => {
  it('covers every visible day, including the neighbouring months in the first and last weeks, with a day of padding', () => {
    const keys = monthGridKeys(2026, 8); // September 2026: the grid runs 30 Aug to 3 Oct
    expect(keys[0]).toBe('2026-08-30');
    expect(keys[keys.length - 1]).toBe('2026-10-03');
    const { from, to } = gridFetchRange(keys);
    expect(from).toBe('2026-08-29T00:00:00.000Z');
    expect(to).toBe('2026-10-05T00:00:00.000Z');
  });

  it('reaches past the grid by more than any timezone offset, so no local day is cut off', () => {
    const keys = monthGridKeys(2026, 0);
    const { from, to } = gridFetchRange(keys);
    const firstDayStart = new Date(`${keys[0]}T00:00:00.000Z`).getTime();
    const lastDayEnd = new Date(`${keys[keys.length - 1]}T23:59:59.999Z`).getTime();
    const DAY = 24 * 60 * 60 * 1000;
    expect(firstDayStart - new Date(from).getTime()).toBeGreaterThanOrEqual(14 * 60 * 60 * 1000);
    expect(new Date(to).getTime() - lastDayEnd).toBeGreaterThanOrEqual(14 * 60 * 60 * 1000 - DAY + 1);
  });

  it('works across a year boundary', () => {
    const keys = monthGridKeys(2026, 11); // December 2026 ends in January 2027
    expect(keys[keys.length - 1].startsWith('2027-01')).toBe(true);
    expect(gridFetchRange(keys).to.startsWith('2027-01')).toBe(true);
  });
});

describe('formatTimeInZone', () => {
  it('shows the clock time where the workspace is', () => {
    const iso = '2026-09-15T23:30:00.000Z';
    expect(formatTimeInZone(iso, 'UTC')).toMatch(/11:30\s?PM|23:30/i);
    expect(formatTimeInZone(iso, 'Asia/Kolkata')).toMatch(/5:00\s?AM|05:00/i);
  });
});

describe('labels', () => {
  it('names a day in full or short, from its date key alone (no timezone shift)', () => {
    expect(formatDayTitle('2026-10-04')).toContain('4');
    expect(formatDayTitle('2026-10-04')).toContain('2026');
    expect(formatDayTitle('2026-10-04').toLowerCase()).toContain('sunday');
    expect(formatDayTitle('2026-10-04', 'short').toLowerCase()).toContain('sun');
  });

  it('has twelve months starting with January, and seven weekdays starting with Sunday', () => {
    const months = monthNames();
    expect(months).toHaveLength(12);
    expect(months[0].toLowerCase()).toContain('jan');
    expect(months[11].toLowerCase()).toContain('dec');
    const days = weekdayNames('short');
    expect(days).toHaveLength(7);
    expect(days[0].toLowerCase()).toContain('sun');
    expect(days[6].toLowerCase()).toContain('sat');
  });
});
