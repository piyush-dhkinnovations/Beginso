import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { ChartDefinition, ChartSeries, SavedChart } from '@/types/charts';

// Sprint 14 (B5.5 pt 2, BE 0.3, design.md §11.2) - Backend contract to confirm. Unwrapped defensively.
interface Range {
  from?: string;
  to?: string;
}

function toChart(raw: unknown): SavedChart {
  const c = raw as Record<string, unknown>;
  return { ...(c as unknown as SavedChart), _id: String(c._id ?? c.id) };
}

function toSeries(raw: unknown): ChartSeries {
  const body = unwrapEnvelope<{ series?: unknown; total?: unknown }>(raw, 'data') ?? {};
  const series = Array.isArray(body.series) ? (body.series as { label: unknown; value: unknown }[]) : [];
  return {
    series: series.map((s) => ({ label: String(s.label), value: Number(s.value) || 0 })),
    total: typeof body.total === 'number' ? body.total : series.reduce((sum, s) => sum + (Number(s.value) || 0), 0),
  };
}

export const chartsService = {
  list: (formId: string, scope?: string): Promise<SavedChart[]> =>
    axiosInstance.get(`/api/forms/${formId}/charts`, { headers: workspaceHeaders(scope) }).then((r) => {
      const charts = unwrapEnvelope<unknown>(r.data, 'charts');
      return Array.isArray(charts) ? charts.map(toChart) : [];
    }),

  create: (formId: string, definition: ChartDefinition, scope?: string): Promise<SavedChart> =>
    axiosInstance
      .post(`/api/forms/${formId}/charts`, definition, { headers: workspaceHeaders(scope) })
      .then((r) => toChart(unwrapEnvelope<unknown>(r.data, 'chart'))),

  update: (formId: string, chartId: string, patch: Partial<ChartDefinition> & { order?: number }, scope?: string): Promise<SavedChart> =>
    axiosInstance
      .patch(`/api/forms/${formId}/charts/${chartId}`, patch, { headers: workspaceHeaders(scope) })
      .then((r) => toChart(unwrapEnvelope<unknown>(r.data, 'chart'))),

  remove: (formId: string, chartId: string, scope?: string): Promise<void> =>
    axiosInstance.delete(`/api/forms/${formId}/charts/${chartId}`, { headers: workspaceHeaders(scope) }).then(() => undefined),

  data: (formId: string, chartId: string, range: Range, scope?: string): Promise<ChartSeries> =>
    axiosInstance
      .get(`/api/forms/${formId}/charts/${chartId}/data`, { params: range, headers: workspaceHeaders(scope) })
      .then((r) => toSeries(r.data)),

  preview: (formId: string, definition: ChartDefinition, range: Range, scope?: string): Promise<ChartSeries> =>
    axiosInstance
      .post(`/api/forms/${formId}/charts/preview`, { ...definition, ...range }, { headers: workspaceHeaders(scope) })
      .then((r) => toSeries(r.data)),
};
