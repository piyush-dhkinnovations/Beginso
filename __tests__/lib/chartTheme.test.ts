/**
 * __tests__/lib/chartTheme.test.ts
 * Feature: sprint-5-analytics-reports
 * Tests: getBaseChartOption — design-token colors, reduced-motion guard
 * Requirements: 13.4, 14.5
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getBaseChartOption, CHART_COLORS } from '@/lib/chartTheme';

describe('getBaseChartOption', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes the brand and status design-token colors, not chart-library defaults', () => {
    const option = getBaseChartOption();
    expect(option.color).toEqual([
      CHART_COLORS.brand,
      CHART_COLORS.statusNew,
      CHART_COLORS.statusProgress,
      CHART_COLORS.statusCompleted,
    ]);
  });

  it('enables animation by default when reduced motion is not requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    expect(getBaseChartOption().animation).toBe(true);
  });

  it('disables animation when prefers-reduced-motion: reduce matches', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    expect(getBaseChartOption().animation).toBe(false);
  });
});
