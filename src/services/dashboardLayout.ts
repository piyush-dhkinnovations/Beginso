import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { Widget } from '@/components/dashboard-grid/types';

// Custom Home layout. Contract: docs/backend-contract/api-reference.md "Dashboards (custom home layout)".
//   GET    /api/dashboards/home  -> { dashboard: { widgets, version } | null }   (null = never customised)
//   PUT    /api/dashboards/home  { widgets, version? } -> { dashboard }          (409 VERSION_CONFLICT)
//   DELETE /api/dashboards/home  -> reset to default
export interface SavedLayout {
  widgets: Widget[];
  version: number;
}

function unwrap(raw: unknown): SavedLayout | null {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const d = (obj.dashboard ?? obj.data ?? null) as Partial<SavedLayout> | null;
  if (!d || !Array.isArray(d.widgets)) return null;
  return { widgets: d.widgets as Widget[], version: typeof d.version === 'number' ? d.version : 1 };
}

export const dashboardLayoutService = {
  get: (scope: string): Promise<SavedLayout | null> =>
    axiosInstance.get('/api/dashboards/home', { headers: workspaceHeaders(scope) }).then((r) => unwrap(r.data)),

  save: (scope: string, widgets: Widget[], version?: number): Promise<SavedLayout | null> =>
    axiosInstance.put('/api/dashboards/home', { widgets, version }, { headers: workspaceHeaders(scope) }).then((r) => unwrap(r.data)),

  reset: (scope: string): Promise<void> =>
    axiosInstance.delete('/api/dashboards/home', { headers: workspaceHeaders(scope) }).then(() => undefined),
};
