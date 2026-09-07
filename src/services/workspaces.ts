import axiosInstance from '@/lib/axios';
import type { Workspace, WorkspaceListItem } from '@/types/workspace';

export interface CreateWorkspacePayload {
  name: string;
}

// Corrected Day 3 against the real live contract (Beginso-Report/API_CONTRACT.md, confirmed live
// 07 Sep 2026) — design.md §12's "flat object, no unwrapEnvelope" guess was wrong for list():
// GET /api/workspaces actually nests under `{ success, workspaces: [...], total }`, matching
// settingsService's envelope pattern, not formsService's bare-array one. POST /api/workspaces
// (create) is confirmed to return the bare Workspace object (API_CONTRACT.md line 390, unchanged
// since Sprint 7), so create() stays flat. GET /api/workspaces/:id's exact envelope isn't spelled
// out in the contract doc beyond "returns workspace detail" — unwrapped defensively here too,
// same reasoning workspaceServer.ts's resolveWorkspaceBySlug() already applies server-side.
function unwrapEnvelope<T>(raw: unknown, namedKey: string): T {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj[namedKey] !== 'undefined') return obj[namedKey] as T;
  }
  return raw as T;
}

export const workspacesService = {
  list: (): Promise<WorkspaceListItem[]> =>
    axiosInstance.get('/api/workspaces').then((r) => unwrapEnvelope<WorkspaceListItem[]>(r.data, 'workspaces')),

  get: (id: string): Promise<Workspace> =>
    axiosInstance.get(`/api/workspaces/${id}`).then((r) => unwrapEnvelope<Workspace>(r.data, 'workspace')),

  create: (payload: CreateWorkspacePayload): Promise<Workspace> =>
    axiosInstance.post<Workspace>('/api/workspaces', payload).then((r) => r.data),
};
