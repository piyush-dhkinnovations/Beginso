import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { ChartDefinition, ChartOptions, ChartSize, ChartType, ChartVisibility, DateGranularity, FieldBucket, SavedChart } from '@/types/charts';

// Backend contract to confirm (the BE agent is implementing it in parallel; nothing is published in
// shared/types yet). Everything is unwrapped defensively, and the legacy Sprint 14 names (`chartType`,
// `order`) are accepted so a half-migrated backend still renders.
//   GET    /api/forms/:formId/charts                      -> SavedChart[]  (own private + workspace-shared)
//   POST   /api/forms/:formId/charts   ChartDefinition    -> SavedChart
//   PATCH  /api/forms/:formId/charts/:id  Partial<ChartDefinition> & { position? } -> SavedChart
//   DELETE /api/forms/:formId/charts/:id
//   GET    /api/forms/:formId/analytics/field/:fieldId?from&to&granularity -> [{ value, count, percentage }]
interface Range {
  from?: string;
  to?: string;
}

// Backend names differ from the UI's: hbar / stat / (date) bar vs horizontal_bar / average / bar_time.
const LEGACY_TYPE: Record<string, ChartType> = { donut: 'donut', bar: 'bar', line: 'line', hbar: 'horizontal_bar', stat: 'average' };
const WIRE_TYPE: Partial<Record<ChartType, string>> = { horizontal_bar: 'hbar', average: 'stat', bar_time: 'bar' };

// UI definition -> backend body: `type` is `chartType`, option sort 'original' is 'order'.
function toWire<T extends Partial<ChartDefinition>>(def: T): Record<string, unknown> {
  const { type, options, ...rest } = def;
  const body: Record<string, unknown> = { ...rest };
  if (type) body.chartType = WIRE_TYPE[type] ?? type;
  if (options) body.options = { ...options, sort: options.sort === 'original' ? 'order' : options.sort };
  return body;
}
const SIZES = new Set<ChartSize>(['small', 'medium', 'large']);

function toChart(raw: unknown): SavedChart {
  const c = (raw ?? {}) as Record<string, unknown>;
  const opts = (c.options ?? {}) as Partial<ChartOptions>;
  const type = String(c.type ?? c.chartType ?? 'bar');
  const owner = c.owner as { id?: unknown; name?: unknown } | undefined;
  return {
    _id: String(c._id ?? c.id),
    fieldId: String(c.fieldId ?? c.field ?? ''),
    type: (LEGACY_TYPE[type] ?? type) as ChartType,
    size: SIZES.has(c.size as ChartSize) ? (c.size as ChartSize) : 'medium',
    title: typeof c.title === 'string' ? c.title : '',
    options: {
      valueMode: opts.valueMode === 'percent' ? 'percent' : 'count',
      legend: opts.legend !== false,
      sort: opts.sort === 'value' ? 'value' : 'original', // backend 'order' -> UI 'original'
    },
    visibility: (c.visibility === 'workspace' ? 'workspace' : 'private') as ChartVisibility,
    position: Number(c.position ?? c.order ?? 0) || 0,
    ownerId: c.ownerId != null ? String(c.ownerId) : owner?.id != null ? String(owner.id) : undefined,
    ownerName: typeof c.ownerName === 'string' ? c.ownerName : typeof owner?.name === 'string' ? owner.name : undefined,
    fieldMissing: c.fieldMissing === true,
    canEdit: typeof c.canEdit === 'boolean' ? c.canEdit : undefined,
    kind: c.kind === 'simple' || c.kind === 'drilldown' ? c.kind : 'legacy',
    definition: (c.kind === 'simple' || c.kind === 'drilldown') && c.definition && typeof c.definition === 'object' ? (c.definition as SavedChart['definition']) : undefined,
    version: typeof c.version === 'number' ? c.version : undefined,
  };
}

function toBuckets(raw: unknown): FieldBucket[] {
  let body: unknown = unwrapEnvelope<unknown>(raw, 'data');
  if (!Array.isArray(body) && body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    body = o.buckets ?? o.values ?? o.series ?? o.distribution;
  }
  if (!Array.isArray(body)) return [];
  return (body as Record<string, unknown>[]).map((b) => ({
    value: String(b.value ?? b.label ?? ''),
    count: Number(b.count ?? b.value_count) || 0,
    percentage: Number(b.percentage) || 0,
  }));
}

export const chartsService = {
  list: (formId: string, scope?: string): Promise<SavedChart[]> =>
    axiosInstance.get(`/api/forms/${formId}/charts`, { headers: workspaceHeaders(scope) }).then((r) => {
      const charts = unwrapEnvelope<unknown>(r.data, 'charts');
      return Array.isArray(charts) ? charts.map(toChart) : [];
    }),

  create: (formId: string, definition: ChartDefinition & { position?: number }, scope?: string): Promise<SavedChart> =>
    axiosInstance
      .post(`/api/forms/${formId}/charts`, toWire(definition), { headers: workspaceHeaders(scope) })
      .then((r) => toChart(unwrapEnvelope<unknown>(r.data, 'chart'))),

  update: (formId: string, chartId: string, patch: Partial<ChartDefinition> & { position?: number }, scope?: string): Promise<SavedChart> =>
    axiosInstance
      .patch(`/api/forms/${formId}/charts/${chartId}`, toWire(patch), { headers: workspaceHeaders(scope) })
      .then((r) => toChart(unwrapEnvelope<unknown>(r.data, 'chart'))),

  /** Own chart ids in the new order (one request, atomic). */
  reorder: (formId: string, ids: string[], scope?: string): Promise<void> =>
    axiosInstance.put(`/api/forms/${formId}/charts/order`, { ids }, { headers: workspaceHeaders(scope) }).then(() => undefined),

  duplicate: (formId: string, chartId: string, scope?: string): Promise<SavedChart> =>
    axiosInstance
      .post(`/api/forms/${formId}/charts/${chartId}/duplicate`, {}, { headers: workspaceHeaders(scope) })
      .then((r) => toChart(unwrapEnvelope<unknown>(r.data, 'chart'))),

  remove: (formId: string, chartId: string, scope?: string): Promise<void> =>
    axiosInstance.delete(`/api/forms/${formId}/charts/${chartId}`, { headers: workspaceHeaders(scope) }).then(() => undefined),

  /** The one data source for every chart, the preview and the full-screen table. */
  fieldDistribution: (formId: string, fieldId: string, range: Range, granularity: DateGranularity | undefined, scope?: string): Promise<FieldBucket[]> =>
    axiosInstance
      .get(`/api/forms/${formId}/analytics/field/${encodeURIComponent(fieldId)}`, {
        params: { ...range, granularity },
        headers: workspaceHeaders(scope),
      })
      .then((r) => toBuckets(r.data)),
};
