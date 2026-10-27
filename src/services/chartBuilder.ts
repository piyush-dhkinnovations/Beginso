import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { AnyChartQuery, BuilderChart, BuilderChartSize, BuilderChartType, PathStep, QueryResult } from '@/types/chartBuilder';

// Charts v3 (see Beginso-Backend/src/utils/chartQuery.ts). A chart is saved with its whole query; the live preview runs the same query
// without saving it. Responses are defensively unwrapped like the other services: the answer is either flat or under `chart`.

export interface SaveChartPayload {
  definition: AnyChartQuery;
  chartType: BuilderChartType;
  size: BuilderChartSize;
  title: string;
  visibility: 'private' | 'workspace';
}

const toChart = (raw: unknown): BuilderChart => unwrapEnvelope<BuilderChart>(raw, 'chart');

export const chartBuilderService = {
  /**
   * Runs a chart that does not have to be saved (the wizard's live preview). `signal` cancels it when the person keeps typing.
   * `path` is a drill-down chart's parts already clicked, outermost first.
   */
  query: (formId: string, definition: AnyChartQuery, scope?: string, signal?: AbortSignal, path?: PathStep[]): Promise<QueryResult> =>
    axiosInstance
      .post(`/api/forms/${formId}/charts/query`, { definition, ...(path?.length ? { path } : {}) }, { headers: workspaceHeaders(scope), signal })
      .then((r) => r.data as QueryResult),

  create: (formId: string, payload: SaveChartPayload, scope?: string): Promise<BuilderChart> =>
    axiosInstance.post(`/api/forms/${formId}/charts`, payload, { headers: workspaceHeaders(scope) }).then((r) => toChart(r.data)),

  update: (formId: string, chartId: string, patch: Partial<SaveChartPayload> & { expectedVersion?: number }, scope?: string): Promise<BuilderChart> =>
    axiosInstance.patch(`/api/forms/${formId}/charts/${chartId}`, patch, { headers: workspaceHeaders(scope) }).then((r) => toChart(r.data)),

  /** A saved chart's answer (the dashboard card). */
  data: (formId: string, chartId: string, scope?: string): Promise<{ fieldMissing: boolean; query: QueryResult }> =>
    axiosInstance.get(`/api/forms/${formId}/charts/${chartId}/data`, { headers: workspaceHeaders(scope) }).then((r) => r.data),
};
