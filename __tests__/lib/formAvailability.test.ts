/**
 * Feature: sprint-3-public-form (post-launch addition — client-side closeDate courtesy check)
 */

import { describe, it, expect } from 'vitest';
import { isPastCloseDate } from '@/lib/formAvailability';

describe('isPastCloseDate', () => {
  it('returns false when closeDate is not set', () => {
    expect(isPastCloseDate(undefined)).toBe(false);
  });

  it('returns true for a closeDate in the past', () => {
    expect(isPastCloseDate('2020-01-01T00:00:00.000Z', new Date('2026-01-01T00:00:00.000Z'))).toBe(true);
  });

  it('returns false for a closeDate in the future', () => {
    expect(isPastCloseDate('2030-01-01T00:00:00.000Z', new Date('2026-01-01T00:00:00.000Z'))).toBe(false);
  });

  it('returns false for an unparsable closeDate instead of throwing', () => {
    expect(isPastCloseDate('not-a-date')).toBe(false);
  });
});
