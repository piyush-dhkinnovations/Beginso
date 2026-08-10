/**
 * __tests__/lib/dateRange.test.ts
 * Feature: sprint-5-analytics-reports
 * Tests: resolveDateRangePreset, normalizeDateRange, resolveTrendBucket
 * Requirements: 3.2-3.4, 4 (bucket note)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveDateRangePreset, normalizeDateRange, resolveTrendBucket } from '@/lib/dateRange';

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
  ] as const)('%s spans exactly %d UTC days ending today, at UTC day boundaries', (preset, days) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T15:30:00.000Z'));

    const { from, to } = resolveDateRangePreset(preset);
    expect(from).toBeDefined();
    expect(to).toBeDefined();

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    expect(fromDate.getUTCHours()).toBe(0);
    expect(fromDate.getUTCMinutes()).toBe(0);
    expect(toDate.getUTCHours()).toBe(23);
    expect(toDate.getUTCMinutes()).toBe(59);

    const spanDays = Math.round((toDate.getTime() - fromDate.getTime() + 1) / (24 * 60 * 60 * 1000));
    expect(spanDays).toBe(days);

    expect(toDate.getUTCFullYear()).toBe(2026);
    expect(toDate.getUTCMonth()).toBe(7); // August
    expect(toDate.getUTCDate()).toBe(10);
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
