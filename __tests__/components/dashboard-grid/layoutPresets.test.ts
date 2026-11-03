import { describe, it, expect } from 'vitest';
import { LAYOUT_PRESETS, buildLayout } from '@/components/dashboard-grid/layoutPresets';
import type { MetricMap } from '@/components/dashboard-grid/types';

const kpi = (value: number) => ({ label: 'x', value });
const FULL: MetricMap = {
  totalForms: kpi(3),
  totalResponses: { label: 'x', value: 9, trend: [1, 2, 3] },
  publishedForms: kpi(2),
  responsesThisMonth: kpi(4),
  avgPerForm: kpi(3),
  responseTrend: { label: 'x', series: [1, 2, 3] },
  responsesByForm: { label: 'x', segments: [{ label: 'a', value: 1 }] },
  formsByStatus: { label: 'x', segments: [{ label: 'a', value: 1 }] },
  responseMap: { label: 'x', points: [{ country: 'IN', region: null, city: null, lat: 1, lng: 1, count: 2 }], located: 2, total: 2 },
};

describe('layout presets', () => {
  it('every preset builds widgets with unique ids that fit the 12 columns, when all the data exists', () => {
    for (const preset of LAYOUT_PRESETS) {
      const widgets = buildLayout(preset, FULL);
      expect(widgets.length, preset.name).toBeGreaterThan(0);
      expect(new Set(widgets.map((w) => w.id)).size, preset.name).toBe(widgets.length);
      widgets.forEach((w) => expect([3, 4, 6, 12]).toContain(w.w));
    }
  });

  it('leaves out a widget whose data does not exist, instead of drawing it empty', () => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === 'overview')!;
    const ids = buildLayout(preset, { totalForms: kpi(1), responsesByForm: FULL.responsesByForm }).map((w) => w.id);
    expect(ids).toEqual(['l-forms', 'l-byform']);
  });

  it('offers the map only when responses have places on it', () => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === 'map')!;
    expect(buildLayout(preset, FULL).some((w) => w.config.type === 'map')).toBe(true);
    expect(buildLayout(preset, { ...FULL, responseMap: { label: 'x', points: [], located: 0, total: 0 } }).some((w) => w.config.type === 'map')).toBe(false);
  });

  it('gives a number card its trend look when the responses have a trend', () => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === 'numbers')!;
    const card = buildLayout(preset, FULL).find((w) => w.id === 'l-responses')!;
    expect(card.config).toMatchObject({ type: 'kpi', variant: 1 });
  });

  it('gives nothing when there is no data at all', () => {
    LAYOUT_PRESETS.forEach((p) => expect(buildLayout(p, {})).toEqual([]));
  });
});
