import axiosInstance from '@/lib/axios';
import type { Form, CreateFormPayload, UpdateFormPayload } from '@/types/form';
import type { FormDestination, FormsContext } from '@/types/workspace';

export const formsService = {
  createForm: (payload: CreateFormPayload) =>
    axiosInstance.post<{ _id: string; title: string }>('/api/forms', payload).then(r => r.data),

  moveForm: (formId: string, destination: FormDestination) =>
    axiosInstance
      .post<Form>(`/api/forms/${formId}/move`, {
        targetWorkspaceId: destination.type === 'workspace' ? destination.workspaceId : 'personal',
      })
      .then((r) => r.data),

  // Real bug found and fixed: this never told the backend which context (personal vs. which
  // workspace) it was asking for, so `GET /api/forms` always fell through to
  // `requirePermission()`'s workspace-resolution step 4 — "caller's default `user.workspaceId`"
  // (API_CONTRACT.md's "Workspace Resolution" order) — every context showed the exact same list.
  // A form created in a workspace then appeared in Personal space too, and switching workspaces
  // never changed what loaded. Fixed by sending step 1's `x-workspace-slug` header for workspace
  // context (the only resolution mechanism the contract confirms accepts a slug, not an ObjectId
  // — `context.workspaceId` here is literally the URL slug, not a Mongo `_id`).
  //
  // Personal context is the less-confirmed half: nothing in the documented resolution order
  // describes an explicit "ignore my default workspace" override for a GET. `workspaceId=personal`
  // is sent as a best-effort query param, matching the `null`/`'personal'` convention this same
  // backend already uses on `/forms/:id/move` and form creation — not directly confirmed for this
  // endpoint. If a caller's default workspace still leaks into personal listings after this,
  // that confirms the override needs backend support, not a different frontend guess.
  getForms: (
    params?: { search?: string; status?: string; page?: number; limit?: number },
    context?: FormsContext
  ) =>
    axiosInstance
      .get<{ forms: Form[]; total: number; page: number; limit: number }>('/api/forms', {
        params: {
          ...params,
          ...(context?.type === 'personal' ? { workspaceId: 'personal' } : {}),
        },
        headers: context?.type === 'workspace' ? { 'x-workspace-slug': context.workspaceId } : undefined,
      })
      .then(r => r.data),

  getFormById: (id: string) =>
    axiosInstance.get<Form>(`/api/forms/${id}`).then(r => r.data),

  updateForm: (id: string, payload: UpdateFormPayload) =>
    axiosInstance.patch<Form>(`/api/forms/${id}`, payload).then(r => r.data),

  deleteForm: (id: string) =>
    axiosInstance.delete(`/api/forms/${id}`).then(() => undefined),

  duplicateForm: (id: string) =>
    axiosInstance.post<{ _id: string; title: string }>(`/api/forms/${id}/duplicate`).then(r => r.data),

  publishForm: (id: string) =>
    axiosInstance
      .post<{ _id: string; status: 'published'; slug: string; publishedAt: string }>(`/api/forms/${id}/publish`)
      .then(r => r.data),

  closeForm: (id: string) =>
    axiosInstance.post<{ _id: string; status: 'closed' }>(`/api/forms/${id}/close`).then(r => r.data),
};

