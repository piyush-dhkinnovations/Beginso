import axiosInstance from '@/lib/axios';
import type { Workspace, WorkspaceListItem } from '@/types/workspace';

export interface CreateWorkspacePayload {
  name: string;
}

// Flat-object shape matching formsService, not settingsService's unwrapEnvelope — design.md §12's
// call, since GET /api/workspaces and GET /api/workspaces/:id aren't live yet (requirements.md
// §4, tasks.md Phase 0 note) to confirm the real envelope against. Adjust if the live response
// turns out to nest under a named key, per CLAUDE.md's defensive-unwrap convention.
export const workspacesService = {
  list: (): Promise<WorkspaceListItem[]> => axiosInstance.get<WorkspaceListItem[]>('/api/workspaces').then((r) => r.data),

  get: (id: string): Promise<Workspace> => axiosInstance.get<Workspace>(`/api/workspaces/${id}`).then((r) => r.data),

  create: (payload: CreateWorkspacePayload): Promise<Workspace> =>
    axiosInstance.post<Workspace>('/api/workspaces', payload).then((r) => r.data),
};
