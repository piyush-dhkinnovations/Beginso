import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { Template } from '@/types/form';

export const templatesService = {
  // Confirmed contract (docs/backend-contract/api-reference.md §2K): a bare array or
  // `{ templates: [...] }`/`{ data: [...] }`, matching the `{ success, ... }` envelope convention
  // seen elsewhere in this backend. Accepts all three shapes and still throws on anything else so
  // a genuinely malformed response surfaces as a query error (handled by the Templates page)
  // instead of crashing with "x.map is not a function".
  //
  // Sprint 13 (B6.1): `scope` is a workspace slug or 'personal'. A workspace gets built-ins PLUS its own
  // templates (each tagged `source`); personal context gets built-ins only.
  getTemplates: (scope: string = 'personal'): Promise<Template[]> =>
    axiosInstance.get('/api/templates', { headers: workspaceHeaders(scope) }).then((r) => {
      const body = r.data;
      const templates = Array.isArray(body) ? body : body?.templates ?? body?.data;
      if (!Array.isArray(templates)) {
        throw new Error('Unexpected /api/templates response shape');
      }
      return templates as Template[];
    }),

  // Sprint 13 (B6.4): publish a form to the workspace's templates (Editor and above). A snapshot — fields,
  // logic, pages, settings and theme; never responses, notes, assignees, tags or the share link.
  publishAsTemplate: (
    scope: string,
    payload: { formId: string; name?: string; description?: string }
  ): Promise<{ _id: string; name: string }> =>
    axiosInstance
      .post('/api/templates', payload, { headers: workspaceHeaders(scope) })
      .then((r) => {
        const data = (r.data?.data ?? r.data) as { _id?: string; name?: string };
        if (!data?._id) throw new Error('Unexpected POST /api/templates response shape');
        return { _id: data._id, name: data.name ?? payload.name ?? '' };
      }),

  // Owner/Admin only; built-in templates cannot be removed.
  removeTemplate: (id: string, scope: string) =>
    axiosInstance.delete(`/api/templates/${id}`, { headers: workspaceHeaders(scope) }).then(() => undefined),

  // Same dual-shape handling as getTemplates(): the backend may wrap this in `{ data: {...} }`
  // rather than returning the form object raw, so unwrap both shapes and throw on anything
  // else — otherwise a missing `_id` silently navigates to `/forms/undefined/edit`.
  //
  // Real bug found and fixed: this sent no `destinationWorkspaceId` at all, even though
  // `template.controller.ts`'s `useTemplate` explicitly supports one (same body field
  // `formsService.createForm` already sends) and only falls back to
  // `getVerifiedWorkspaceId(req)` — the caller's default workspace membership — when it's
  // omitted. A Personal-space user who also belongs to a workspace had every "Use template"
  // silently land the new form in that workspace instead of Personal. `/templates` is reachable
  // only from the Personal shell today (no workspace-scoped templates route exists yet), so this
  // always sends `null` (personal), mirroring `CreateFormModal`'s own personal case.
  useTemplate: (templateId: string, destinationWorkspaceId: string | null = null): Promise<{ _id: string; title: string }> =>
    axiosInstance.post(`/api/templates/${templateId}/use`, { destinationWorkspaceId }).then((r) => {
      const body = r.data as { _id?: string; title?: string; data?: { _id?: string; title?: string } };
      const form = body?._id ? body : body?.data;
      if (!form?._id) {
        throw new Error('Unexpected /api/templates/:id/use response shape');
      }
      return form as { _id: string; title: string };
    }),
};
