import { describe, expect, it } from 'vitest';
import { monthFetchRange, monthGridKeys, localDateKey } from '@/lib/calendarDates';

describe('calendarDates', () => {
  it('lands a 23:30 UTC submission on the correct local day for an IST workspace', () => {
    // design.md's own acceptance case (task 3.3's "Done").
    expect(localDateKey('2026-09-15T23:30:00.000Z', 'Asia/Kolkata')).toBe('2026-09-16');
    expect(localDateKey('2026-09-15T23:30:00.000Z', 'UTC')).toBe('2026-09-15');
  });

  it('pads the fetch window by a day on each side of the month', () => {
    const { from, to } = monthFetchRange(2026, 8); // September (0-indexed)
    expect(from).toBe(new Date('2026-08-31T00:00:00.000Z').toISOString());
    expect(to).toBe(new Date('2026-10-02T00:00:00.000Z').toISOString());
  });

  it('produces full weeks (a multiple of 7 keys) covering the month', () => {
    const keys = monthGridKeys(2026, 8);
    expect(keys.length % 7).toBe(0);
    expect(keys).toContain('2026-09-01');
    expect(keys).toContain('2026-09-30');
  });
});
