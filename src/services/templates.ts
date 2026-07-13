import axiosInstance from '@/lib/axios';
import type { Template } from '@/types/form';

export const templatesService = {
  getTemplates: (): Promise<Template[]> =>
    axiosInstance.get<Template[]>('/api/templates').then((r) => r.data),

  useTemplate: (templateId: string): Promise<{ _id: string; title: string }> =>
    axiosInstance
      .post<{ _id: string; title: string }>(`/api/templates/${templateId}/use`)
      .then((r) => r.data),
};
