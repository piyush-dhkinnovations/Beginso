import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { Form, FormOverviewStats, CreateFormPayload, UpdateFormPayload } from '@/types/form';
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
  // Second layer of this same bug, found a day later: the header approach above was correct but
  // a no-op — our own BFF (`src/app/api/backend/[...path]/route.ts`) rebuilt the upstream request
  // headers from a fixed whitelist and silently dropped `x-workspace-slug` before it ever reached
  // the real backend. Fixed there; this file needed no further change once that was forwarded.
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

  // Backend contract to confirm (BE 0.6): written against the "extend GET /api/forms/:id" shape
  // (tasks.md 2.2's stated smaller diff), not a separate /overview route. Nothing about the
  // stats fields is confirmed live, so each one degrades to null rather than being invented —
  // `completionRate` because view-tracking (B5.4) may not exist, `responseCountThisWeek` because
  // the extension itself may not have shipped. Envelope unwrapped defensively (`form` key) like
  // every service since Sprint 9.
  getFormOverview: (id: string): Promise<{ form: Form; stats: FormOverviewStats }> =>
    axiosInstance.get(`/api/forms/${id}`).then((r) => {
      const raw = r.data as Record<string, unknown>;
      const form = unwrapEnvelope<Form>(raw, 'form');
      const source = (raw?.stats ?? raw?.form ?? raw ?? {}) as Partial<FormOverviewStats>;
      return {
        form,
        stats: {
          responseCount: source.responseCount ?? form.responseCount ?? 0,
          responseCountThisWeek: source.responseCountThisWeek ?? null,
          completionRate: source.completionRate ?? null,
        },
      };
    }),

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

