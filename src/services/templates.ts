import axiosInstance from '@/lib/axios';
import type { Template } from '@/types/form';

export const templatesService = {
  // Response shape isn't finalized on the backend yet (markdown/backend_sprint2_checklist.md
  // item 4 is unconfirmed) — validate at this trust boundary instead of assuming `r.data`
  // is really an array, so a malformed/placeholder response surfaces as a query error
  // (handled by the Templates page) instead of crashing with "x.map is not a function".
  getTemplates: (): Promise<Template[]> =>
    axiosInstance.get('/api/templates').then((r) => {
      if (!Array.isArray(r.data)) {
        throw new Error('Unexpected /api/templates response shape');
      }
      return r.data as Template[];
    }),

  useTemplate: (templateId: string): Promise<{ _id: string; title: string }> =>
    axiosInstance
      .post<{ _id: string; title: string }>(`/api/templates/${templateId}/use`)
      .then((r) => r.data),
};
