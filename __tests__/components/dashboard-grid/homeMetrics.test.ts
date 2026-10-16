import { describe, it, expect } from 'vitest';
import { personalMetrics, personalDefaults, responseMapMetric } from '@/components/dashboard-grid/personalHome';
import { workspaceMetrics, workspaceDefaults } from '@/components/dashboard-grid/workspaceHome';
import { isSeries, isSegments, isLocations, isKpi } from '@/components/dashboard-grid/types';
import type { ResponseLocation } from '@/types/dashboard';

const loc = (count: number): ResponseLocation => ({ country: 'IN', region: null, city: null, lat: 1, lng: 2, count });
const counts = { totalForms: 4, publishedForms: 1, totalResponses: 20, responsesThisMonth: 5 };
const rows = [
  { _id: '1', title: 'A', responseCount: 3 },
  { _id: '2', title: 'B', responseCount: 0 },
  { _id: '3', title: 'C', responseCount: 10 },
];

describe('personalMetrics', () => {
  it('is empty without counts', () => {
    expect(personalMetrics(undefined, [1], rows)).toEqual({});
  });

  it('derives KPI values and percentages', () => {
    const m = personalMetrics(counts, undefined, rows);
    // The ring is the published share, so the card says so (it used to read "1 published" beside an unexplained 25%).
    expect(m.totalForms).toMatchObject({ value: 4, percent: 25, sub: '1 of 4 published' });
    expect(m.publishedForms).toMatchObject({ value: 1, sub: '/ 4', percent: 25 });
    expect(m.responsesThisMonth).toMatchObject({ value: 5, percent: 25, sub: 'of all responses' });
    expect(m.avgPerForm).toMatchObject({ value: '5.0' });
  });

  it('omits trend metrics when there are no non-zero daily responses', () => {
    const m = personalMetrics(counts, [0, 0, 0], rows);
    expect(m.responseTrend).toBeUndefined();
    expect((m.totalResponses as { trend?: number[] }).trend).toBeUndefined();
  });

  it('adds a trend series with one date label per point', () => {
    const m = personalMetrics(counts, [0, 2, 3], rows);
    expect(isSeries(m.responseTrend)).toBe(true);
    const t = m.responseTrend as { series: number[]; labels: string[] };
    expect(t.series).toEqual([0, 2, 3]);
    expect(t.labels).toHaveLength(3);
    expect((m.totalResponses as { trend?: number[] }).trend).toEqual([0, 2, 3]);
  });

  it('omits derived metrics for zero forms / zero responses without dividing by zero', () => {
    const m = personalMetrics({ totalForms: 0, publishedForms: 0, totalResponses: 0, responsesThisMonth: 0 }, undefined, []);
    expect(m.avgPerForm).toBeUndefined();
    expect(m.formsByStatus).toBeUndefined();
    expect(m.responsesByForm).toBeUndefined();
    expect(m.totalForms).toMatchObject({ percent: 0 });
    expect(m.responsesThisMonth).not.toHaveProperty('percent');
  });

  it('splits forms by status and lists top forms with responses, busiest first', () => {
    const m = personalMetrics(counts, undefined, rows);
    expect(m.formsByStatus).toMatchObject({ segments: [{ label: 'Published', value: 1 }, { label: 'Not published', value: 3 }] });
    expect((m.responsesByForm as { segments: unknown[] }).segments).toEqual([{ label: 'C', value: 10 }, { label: 'A', value: 3 }]);
  });

  it('limits responsesByForm to five forms', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ _id: String(i), title: `F${i}`, responseCount: i + 1 }));
    expect((personalMetrics(counts, undefined, many).responsesByForm as { segments: unknown[] }).segments).toHaveLength(5);
  });

  it('offers the map whenever locations were sent, even an empty list', () => {
    expect(personalMetrics(counts, undefined, rows).responseMap).toBeUndefined();
    const m = personalMetrics(counts, undefined, rows, []);
    expect(isLocations(m.responseMap)).toBe(true);
    expect(m.responseMap).toMatchObject({ located: 0, total: 20 });
  });
});

describe('responseMapMetric', () => {
  it('sums located responses', () => {
    expect(responseMapMetric([loc(2), loc(3)], 10)).toMatchObject({ located: 5, total: 10, points: [loc(2), loc(3)] });
  });
});

describe('personalDefaults', () => {
  it('returns nothing for empty metrics', () => {
    expect(personalDefaults({})).toEqual([]);
  });

  it('keeps only widgets whose metric exists and omits an empty map', () => {
    const withEmptyMap = personalDefaults(personalMetrics(counts, [1, 2], rows, []));
    expect(withEmptyMap.map((w) => w.id)).toEqual(['d-forms', 'd-responses', 'd-published', 'd-month', 'd-trend', 'd-byform']);
    const withMap = personalDefaults(personalMetrics(counts, [1, 2], rows, [loc(1)]));
    expect(withMap.map((w) => w.id)).toContain('d-map');
  });

  it('uses the sparkline KPI variant only when a trend exists', () => {
    const variantOf = (ws: ReturnType<typeof personalDefaults>) => {
      const c = ws.find((w) => w.id === 'd-responses')!.config;
      return c.type === 'kpi' ? c.variant : undefined;
    };
    expect(variantOf(personalDefaults(personalMetrics(counts, [1, 2], rows)))).toBe(1);
    expect(variantOf(personalDefaults(personalMetrics(counts, undefined, rows)))).toBe(13);
  });
});

describe('workspaceMetrics', () => {
  const forms = [
    { _id: '1', title: 'A', status: 'published', responseCount: 6 },
    { _id: '2', title: 'B', status: 'draft' },
    { _id: '3', title: 'C', status: 'closed', responseCount: 2 },
    { _id: '4', title: 'D', status: 'draft', responseCount: 0 },
  ];

  it('derives totals from the forms list', () => {
    const m = workspaceMetrics(forms, 12);
    expect(m.totalForms).toMatchObject({ value: 12, percent: 25, sub: '1 published' });
    expect(m.totalResponses).toMatchObject({ value: 8 });
    expect(m.publishedForms).toMatchObject({ value: 1, sub: '/ 4' });
    expect(m.avgPerForm).toMatchObject({ value: '2.0' });
  });

  it('omits zero-size status segments', () => {
    const m = workspaceMetrics([{ _id: '1', title: 'A', status: 'published' }], 1);
    expect((m.formsByStatus as { segments: unknown[] }).segments).toEqual([{ label: 'Published', value: 1 }]);
    const full = workspaceMetrics(forms, 4).formsByStatus as { segments: { label: string; value: number }[] };
    expect(full.segments.map((s) => `${s.label}:${s.value}`)).toEqual(['Published:1', 'Draft:2', 'Closed:1']);
  });

  it('handles no forms', () => {
    const m = workspaceMetrics([], 0);
    expect(m.avgPerForm).toBeUndefined();
    expect(m.formsByStatus).toBeUndefined();
    expect(m.responsesByForm).toBeUndefined();
    expect(m.totalForms).toMatchObject({ percent: 0 });
  });

  it('ranks forms by responses and adds the map when locations are present', () => {
    const m = workspaceMetrics(forms, 4, [loc(1)]);
    expect((m.responsesByForm as { segments: { label: string }[] }).segments.map((s) => s.label)).toEqual(['A', 'C']);
    expect(m.responseMap).toMatchObject({ total: 8, located: 1 });
  });
});

describe('workspaceDefaults', () => {
  const metrics = workspaceMetrics([
    { _id: '1', title: 'A', status: 'published', responseCount: 6 },
    { _id: '2', title: 'B', status: 'draft', responseCount: 1 },
  ], 2);
  const idsFor = (role: Parameters<typeof workspaceDefaults>[1]) => workspaceDefaults(metrics, role).map((w) => w.id);

  it('viewers and reviewers get just the two KPIs', () => {
    expect(idsFor('viewer')).toEqual(['d-forms', 'd-responses']);
    expect(idsFor('reviewer')).toEqual(['d-forms', 'd-responses']);
  });

  it('members and editors lead with responses and get charts', () => {
    expect(idsFor('member')).toEqual(['d-responses', 'd-forms', 'd-avg', 'd-byform', 'd-status']);
    expect(idsFor('editor')).toEqual(idsFor('member'));
  });

  it('admins and unknown roles get the full set, with a status bar chart', () => {
    const ws = workspaceDefaults(metrics, 'admin');
    expect(ws.map((w) => w.id)).toEqual(['d-forms', 'd-responses', 'd-published', 'd-avg', 'd-byform', 'd-status']);
    const status = ws.find((w) => w.id === 'd-status')!.config;
    expect(status.type === 'chart' && status.chart).toBe('status');
    expect(workspaceDefaults(metrics, undefined)).toHaveLength(6);
  });

  it('drops widgets whose metric is missing', () => {
    expect(workspaceDefaults({}, 'admin')).toEqual([]);
    const only = workspaceDefaults(workspaceMetrics([], 0), 'member').map((w) => w.id);
    expect(only).toEqual(['d-responses', 'd-forms']);
  });
});

describe('metric type guards', () => {
  it('distinguish the metric shapes', () => {
    expect(isSegments({ label: 'x', segments: [] })).toBe(true);
    expect(isKpi({ label: 'x', value: 1 })).toBe(true);
    expect(isKpi({ label: 'x', series: [] })).toBe(false);
    expect(isKpi(undefined)).toBe(false);
  });
});
