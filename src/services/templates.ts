import axiosInstance from '@/lib/axios';
import type { Template } from '@/types/form';

export const templatesService = {
  // Confirmed contract (docs/backend-contract/api-reference.md §2K): a bare array or
  // `{ templates: [...] }`/`{ data: [...] }`, matching the `{ success, ... }` envelope convention
  // seen elsewhere in this backend. Accepts all three shapes and still throws on anything else so
  // a genuinely malformed response surfaces as a query error (handled by the Templates page)
  // instead of crashing with "x.map is not a function".
  getTemplates: (): Promise<Template[]> =>
    axiosInstance.get('/api/templates').then((r) => {
      const body = r.data;
      const templates = Array.isArray(body) ? body : body?.templates ?? body?.data;
      if (!Array.isArray(templates)) {
        throw new Error('Unexpected /api/templates response shape');
      }
      return templates as Template[];
    }),

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
