import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { Workspace, WorkspaceListItem } from '@/types/workspace';

export interface CreateWorkspacePayload {
  name: string;
  /** Logo image URL (from POST /api/upload), shown in the sidebar. Omitted = the BeginSo default. */
  logo?: string;
}

// Corrected against the real live contract (Beginso-Report/API_CONTRACT.md, confirmed live
// 07 Sep 2026) — a "flat object, no unwrapEnvelope" guess was wrong for list(): GET
// /api/workspaces actually nests under `{ success, workspaces: [...], total }`, matching
// settingsService's envelope pattern, not formsService's bare-array one. GET /api/workspaces/:id's
// exact envelope isn't spelled out in the contract doc beyond "returns workspace detail" —
// unwrapped defensively here too, same reasoning workspaceServer.ts's resolveWorkspaceBySlug()
// already applies server-side.
//
// create() corrected 10 Sep 2026: previously assumed POST /api/workspaces returns the bare
// Workspace object ("confirmed... unchanged since Sprint 7" — that claim was never actually
// verified against a live response, only inferred from the contract doc's prose, which doesn't
// spell out the JSON shape at all). Live evidence: CreateWorkspaceModal's post-create
// `router.push('/w/${workspace.slug}')` landed on `/w/undefined` — proof the real response is
// enveloped like every other workspace endpoint, not bare. Unwrapped the same way as get(), same
// 'workspace' key.
// unwrapEnvelope() itself moved to src/lib/apiEnvelope.ts (Sprint 9, design.md §12) so the new
// team/invitations/formAccess/shared services share one implementation instead of four copies.

export const workspacesService = {
  list: (): Promise<WorkspaceListItem[]> =>
    axiosInstance.get('/api/workspaces').then((r) => unwrapEnvelope<WorkspaceListItem[]>(r.data, 'workspaces')),

  get: (id: string): Promise<Workspace> =>
    axiosInstance.get(`/api/workspaces/${id}`).then((r) => unwrapEnvelope<Workspace>(r.data, 'workspace')),

  create: (payload: CreateWorkspacePayload): Promise<Workspace> =>
    axiosInstance
      .post('/api/workspaces', payload)
      .then((r) => unwrapEnvelope<Workspace>(r.data, 'workspace')),

  // DELETE /api/workspaces/:slug — deletes the workspace (not the account). Owner-only.
  // Backend endpoint is needed — see docs/backend-contract/api-reference.md §"Per-workspace delete".
  delete: (slug: string): Promise<void> =>
    axiosInstance.delete(`/api/workspaces/${slug}`).then(() => undefined),
};
