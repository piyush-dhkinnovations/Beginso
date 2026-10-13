import { describe, it, expect } from 'vitest';
import { chartsFor, isKpi, isLocations, isSegments, isSeries, TONES, WIDTHS } from '@/components/dashboard-grid/types';

const series = { label: 's', series: [1] };
const segs = { label: 'g', segments: [] };
const locs = { label: 'l', points: [], located: 0, total: 0 };
const kpi = { label: 'k', value: 1 };

describe('dashboard widget type guards', () => {
  it.each([
    ['series', series, [true, false, false, false]],
    ['segments', segs, [false, true, false, false]],
    ['locations', locs, [false, false, true, false]],
    ['kpi', kpi, [false, false, false, true]],
  ])('classifies %s', (_n, m, [ser, seg, loc, k]) => {
    expect([isSeries(m), isSegments(m), isLocations(m), isKpi(m)]).toEqual([ser, seg, loc, k]);
  });

  it('rejects null, undefined and primitives', () => {
    for (const v of [null, undefined, 0, 'x']) {
      expect(isSeries(v)).toBe(false);
    }
    expect(isKpi(null)).toBe(false);
    expect(isKpi(undefined)).toBe(false);
  });

  it('offers time-series looks for a series and category looks for segments', () => {
    expect(chartsFor(series)).toEqual(['bar', 'line', 'area']);
    expect(chartsFor(segs)).toEqual(['donut', 'pie', 'hbar', 'bar', 'status']);
  });

  it('exposes the width and tone options', () => {
    expect(WIDTHS).toEqual([3, 4, 6, 12]);
    expect(TONES.map((t) => t.value)).toEqual(['primary', 'success', 'warning', 'error', 'purple']);
  });
});
