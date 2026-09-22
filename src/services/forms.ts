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
      .then((r) => {
        // Real bug found and fixed: the comment above already flagged this as unconfirmed — now
        // confirmed live. A brand-new user whose "default workspace" (the backend's own
        // resolution-order fallback) is the workspace they just joined via invite accept sees
        // that workspace's forms leak into their *personal* space list — `workspaceId=personal`
        // isn't honored server-side for this case. Filtered here as a client-side safety net
        // (never trust the backend's own scoping without checking, this session's own
        // established pattern) so Personal space can never show a workspace-owned form
        // regardless of what the backend's query actually returned.
        if (context?.type !== 'personal') return r.data;
        const forms = r.data.forms.filter((form) => form.workspaceId === null);
        const filteredOut = r.data.forms.length - forms.length;
        return filteredOut === 0
          ? r.data
          : { ...r.data, forms, total: Math.max(0, r.data.total - filteredOut) };
      }),

  getFormById: (id: string) =>
    axiosInstance.get<Form>(`/api/forms/${id}`).then(r => r.data),

  // Real bug found and fixed (22 Sep 2026): this was written against "extend GET /api/forms/:id"
  // (tasks.md 2.2's stated smaller diff) because no live example existed yet — confirmed live
  // today that the backend instead built a genuinely separate `GET /api/forms/:id/overview`
  // route, `{ success, overview: { formId, title, description, status, workspaceId,
  // responseCount, responseCountThisWeek, completionRate, createdAt, updatedAt } }`. The base
  // `GET /api/forms/:id` was never extended with stats at all — calling only it, as this used to,
  // meant every stat silently degraded to its null/0 fallback forever, never actually reading a
  // real number. That slim `overview` object is also missing `slug` (needed for the public share
  // link) and the builder-only fields (`fields`/`pages`/`branding`/`settings`) this page doesn't
  // need — so this still calls the base route too, for the parts only it has, rather than
  // pretend the new endpoint is a full replacement.
  getFormOverview: (id: string): Promise<{ form: Form; stats: FormOverviewStats }> =>
    Promise.all([
      axiosInstance.get(`/api/forms/${id}`).then((r) => unwrapEnvelope<Form>(r.data, 'form')),
      axiosInstance
        .get(`/api/forms/${id}/overview`)
        .then((r) => unwrapEnvelope<Partial<FormOverviewStats>>(r.data, 'overview'))
        .catch(() => ({}) as Partial<FormOverviewStats>),
    ]).then(([form, stats]) => ({
      form,
      stats: {
        responseCount: stats.responseCount ?? form.responseCount ?? 0,
        responseCountThisWeek: stats.responseCountThisWeek ?? null,
        completionRate: stats.completionRate ?? null,
      },
    })),

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

