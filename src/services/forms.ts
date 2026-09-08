import axiosInstance from '@/lib/axios';
import type { Form, CreateFormPayload, UpdateFormPayload } from '@/types/form';
import type { FormDestination } from '@/types/workspace';

export const formsService = {
  createForm: (payload: CreateFormPayload) =>
    axiosInstance.post<{ _id: string; title: string }>('/api/forms', payload).then(r => r.data),

  moveForm: (formId: string, destination: FormDestination) =>
    axiosInstance
      .post<Form>(`/api/forms/${formId}/move`, {
        targetWorkspaceId: destination.type === 'workspace' ? destination.workspaceId : 'personal',
      })
      .then((r) => r.data),

  getForms: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    axiosInstance.get<{ forms: Form[]; total: number; page: number; limit: number }>('/api/forms', { params }).then(r => r.data),

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

