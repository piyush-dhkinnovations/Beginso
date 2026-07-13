import axiosInstance from '@/lib/axios';
import type { UploadResponse } from '@/types/form';

export const uploadService = {
  uploadFile: (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance
      .post<UploadResponse>('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
