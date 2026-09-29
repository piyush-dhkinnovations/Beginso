import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { SavedView, SavedViewPayload } from '@/types/savedView';

/**
 * BE 0.4 — not yet built (design.md §11.2). `views` root already added to the BFF's
 * `ALLOWED_API_ROOTS` (task 1.9) — the named 404 trap this file would otherwise hit.
 */
export const viewsService = {
  list: (scope: string, formId?: string): Promise<SavedView[]> =>
    axiosInstance
      .get('/api/views', { params: { formId }, headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<SavedView[]>(r.data, 'views'))
      .then((views) => (Array.isArray(views) ? views : [])),

  create: (scope: string, payload: SavedViewPayload): Promise<SavedView> =>
    axiosInstance
      .post('/api/views', payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<SavedView>(r.data, 'view')),

  update: (scope: string, id: string, payload: Partial<SavedViewPayload>): Promise<SavedView> =>
    axiosInstance
      .patch(`/api/views/${id}`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<SavedView>(r.data, 'view')),

  remove: (scope: string, id: string): Promise<void> =>
    axiosInstance.delete(`/api/views/${id}`, { headers: workspaceHeaders(scope) }).then(() => undefined),
};
