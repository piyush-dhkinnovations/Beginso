import axiosInstance from '@/lib/axios';
import type { Form, CreateFormPayload, UpdateFormPayload } from '@/types/form';

export const formsService = {
  createForm: (payload: CreateFormPayload) =>
    axiosInstance.post<{ _id: string; title: string }>('/api/forms', payload).then(r => r.data),

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
};
