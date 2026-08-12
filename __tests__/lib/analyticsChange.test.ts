/**
 * __tests__/lib/analyticsChange.test.ts
 * Tests: computeChangePercent, formatChangeLabel — Workspace Analytics' "vs previous period" math
 */

import { describe, it, expect } from 'vitest';
import { computeChangePercent, formatChangeLabel } from '@/lib/analyticsChange';

describe('computeChangePercent', () => {
  it('computes a positive percent change', () => {
    expect(computeChangePercent(120, 100)).toBe(20);
  });

  it('computes a negative percent change', () => {
    expect(computeChangePercent(80, 100)).toBe(-20);
  });

  it('returns null when there is no previous-period baseline (0)', () => {
    expect(computeChangePercent(10, 0)).toBeNull();
  });

  it('returns null for a too-small baseline rather than an inflated percentage (e.g. 2 -> 31)', () => {
    // Real case that surfaced this: a form with 2 responses in the previous period and 31 in the
    // current one produced "+1450%" — technically correct, practically meaningless.
    expect(computeChangePercent(31, 2)).toBeNull();
    expect(computeChangePercent(34, 1)).toBeNull();
  });

  it('returns null for a too-small aggregate baseline too (e.g. a workspace-wide 5 -> 145)', () => {
    // Real case: summed across every form, a previous-period total of 5 against a current 145
    // produced "+2800%" on the summary card — same problem, just aggregated instead of per-row.
    expect(computeChangePercent(145, 5)).toBeNull();
  });

  it('still computes a real percentage once the baseline is large enough to be meaningful', () => {
    expect(computeChangePercent(150, 100)).toBe(50);
    expect(computeChangePercent(15, 10)).toBe(50);
  });

  it('returns null for a negative previous value (defensive — should never happen)', () => {
    expect(computeChangePercent(10, -5)).toBeNull();
  });
});

describe('formatChangeLabel', () => {
  it('renders an up arrow with one decimal place', () => {
    expect(formatChangeLabel(12.04)).toBe('↑ 12.0%');
  });

  it('renders a down arrow with the absolute magnitude', () => {
    expect(formatChangeLabel(-3.2)).toBe('↓ 3.2%');
  });

  it('renders "—" for null (no baseline)', () => {
    expect(formatChangeLabel(null)).toBe('—');
  });

  it('renders "—" for exactly zero change', () => {
    expect(formatChangeLabel(0)).toBe('—');
  });
});
