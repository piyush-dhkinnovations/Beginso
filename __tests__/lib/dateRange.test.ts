/**
 * __tests__/lib/dateRange.test.ts
 * Feature: sprint-5-analytics-reports
 * Tests: resolveDateRangePreset, normalizeDateRange, resolveTrendBucket
 * Requirements: 3.2-3.4, 4 (bucket note)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveDateRangePreset, normalizeDateRange, resolveTrendBucket, resolvePreviousDateRange } from '@/lib/dateRange';

describe('resolveDateRangePreset', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined bounds for "all"', () => {
    expect(resolveDateRangePreset('all')).toEqual({ from: undefined, to: undefined });
  });

  it('returns undefined bounds for "custom" (caller supplies its own range)', () => {
    expect(resolveDateRangePreset('custom')).toEqual({ from: undefined, to: undefined });
  });

  it.each([
    ['7d', 7],
    ['30d', 30],
    ['90d', 90],
  ] as const)('%s spans exactly %d local days ending today, at local day boundaries', (preset, days) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T15:30:00.000Z'));

    const { from, to } = resolveDateRangePreset(preset);
    expect(from).toBeDefined();
    expect(to).toBeDefined();

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    expect([fromDate.getHours(), fromDate.getMinutes()]).toEqual([0, 0]);
    expect([toDate.getHours(), toDate.getMinutes()]).toEqual([23, 59]);

    const spanDays = Math.round((toDate.getTime() - fromDate.getTime() + 1) / (24 * 60 * 60 * 1000));
    expect(spanDays).toBe(days);

    const now = new Date('2026-08-10T15:30:00.000Z');
    expect([toDate.getFullYear(), toDate.getMonth(), toDate.getDate()]).toEqual([now.getFullYear(), now.getMonth(), now.getDate()]);
  });
});

describe('normalizeDateRange', () => {
  it('leaves an already-ordered range untouched', () => {
    const result = normalizeDateRange('2026-08-01T00:00:00.000Z', '2026-08-10T00:00:00.000Z');
    expect(result).toEqual({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-10T00:00:00.000Z' });
  });

  it('swaps an inverted range so from <= to', () => {
    const result = normalizeDateRange('2026-08-10T00:00:00.000Z', '2026-08-01T00:00:00.000Z');
    expect(result).toEqual({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-10T00:00:00.000Z' });
  });

  it('throws on unparseable input instead of returning Invalid Date', () => {
    expect(() => normalizeDateRange('not-a-date', '2026-08-10T00:00:00.000Z')).toThrow();
    expect(() => normalizeDateRange('2026-08-10T00:00:00.000Z', 'also-not-a-date')).toThrow();
  });
});

describe('resolveTrendBucket', () => {
  it('returns "day" for a range spanning 45 days or fewer', () => {
    expect(resolveTrendBucket('2026-08-01T00:00:00.000Z', '2026-08-10T00:00:00.000Z')).toBe('day');
  });

  it('returns "week" for a range spanning more than 45 days', () => {
    expect(resolveTrendBucket('2026-01-01T00:00:00.000Z', '2026-08-10T00:00:00.000Z')).toBe('week');
  });

  it('returns "week" when the range is open-ended (All time preset)', () => {
    expect(resolveTrendBucket(undefined, undefined)).toBe('week');
  });
});

describe('resolvePreviousDateRange', () => {
  it('returns the immediately preceding, equal-length window', () => {
    const result = resolvePreviousDateRange('2026-08-01T00:00:00.000Z', '2026-08-10T00:00:00.000Z');
    expect(result.to).toBe('2026-07-31T23:59:59.999Z');
    expect(result.from).toBe('2026-07-22T23:59:59.999Z');

    const currentSpanMs = new Date('2026-08-10T00:00:00.000Z').getTime() - new Date('2026-08-01T00:00:00.000Z').getTime();
    const previousSpanMs = new Date(result.to as string).getTime() - new Date(result.from as string).getTime();
    expect(previousSpanMs).toBe(currentSpanMs);
  });

  it('returns undefined/undefined for an open-ended range (no previous period for "All time")', () => {
    expect(resolvePreviousDateRange(undefined, undefined)).toEqual({ from: undefined, to: undefined });
  });

  it('returns undefined/undefined for unparseable input rather than throwing', () => {
    expect(resolvePreviousDateRange('not-a-date', '2026-08-10T00:00:00.000Z')).toEqual({ from: undefined, to: undefined });
  });
});

// A7-010: a "day" is the viewer's calendar day. Run in a fixed non-UTC zone so the test means something on any machine.
describe('local-day bounds (A7-010)', () => {
  const original = process.env.TZ;
  afterEach(() => {
    vi.useRealTimers();
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it('a response at 02:00 IST on the 16th falls inside "today" for someone in India', async () => {
    process.env.TZ = 'Asia/Kolkata';
    const { localDayStartIso, localDayEndIso, isoToLocalDateInput, validateDateRange } = await import('@/lib/dateRange');
    expect(localDayStartIso('2026-10-16')).toBe('2026-10-15T18:30:00.000Z');
    expect(localDayEndIso('2026-10-16')).toBe('2026-10-16T18:29:59.999Z');
    const submitted = new Date('2026-10-15T20:30:00.000Z').getTime(); // 02:00 IST on the 16th
    expect(submitted).toBeGreaterThanOrEqual(new Date(localDayStartIso('2026-10-16')).getTime());
    expect(submitted).toBeLessThanOrEqual(new Date(localDayEndIso('2026-10-16')).getTime());
    expect(isoToLocalDateInput('2026-10-15T18:30:00.000Z')).toBe('2026-10-16');
    expect(validateDateRange(localDayStartIso('2026-10-16'), localDayEndIso('2026-10-10'))).toMatch(/on or after/);
    expect(validateDateRange(localDayStartIso('2026-10-10'), localDayEndIso('2026-10-10'))).toBeNull();
  });

  it('presets end at the end of the local day and span whole local days', () => {
    process.env.TZ = 'Asia/Kolkata';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T21:00:00.000Z')); // already the 17th in India
    const { from, to } = resolveDateRangePreset('7d');
    expect(to).toBe('2026-10-17T18:29:59.999Z');
    expect(from).toBe('2026-10-10T18:30:00.000Z');
  });
});
