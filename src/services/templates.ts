import axiosInstance from '@/lib/axios';
import type { Template } from '@/types/form';

export const templatesService = {
  // Response shape isn't finalized on the backend yet (markdown/backend_sprint2_checklist.md
  // item 4 is unconfirmed). This backend wraps every response in `{ success, ... }` (see
  // /api/health, and getForms's `{ forms: [...] }` shape) rather than returning bodies raw,
  // so accept that convention here too (`{ templates: [...] }` or `{ data: [...] }`) as well
  // as a bare array, and still throw on anything else so a genuinely malformed/placeholder
  // response surfaces as a query error (handled by the Templates page) instead of crashing
  // with "x.map is not a function".
  getTemplates: (): Promise<Template[]> =>
    axiosInstance.get('/api/templates').then((r) => {
      const body = r.data;
      const templates = Array.isArray(body) ? body : body?.templates ?? body?.data;
      if (!Array.isArray(templates)) {
        throw new Error('Unexpected /api/templates response shape');
      }
      return templates as Template[];
    }),

  // Same unconfirmed-response-shape situation as getTemplates(): the backend wraps this in
  // `{ data: {...} }` rather than returning the form object raw, so unwrap both shapes and
  // throw on anything else — otherwise a missing `_id` silently navigates to `/forms/undefined/edit`.
  useTemplate: (templateId: string): Promise<{ _id: string; title: string }> =>
    axiosInstance.post(`/api/templates/${templateId}/use`).then((r) => {
      const body = r.data as { _id?: string; title?: string; data?: { _id?: string; title?: string } };
      const form = body?._id ? body : body?.data;
      if (!form?._id) {
        throw new Error('Unexpected /api/templates/:id/use response shape');
      }
      return form as { _id: string; title: string };
    }),
};
