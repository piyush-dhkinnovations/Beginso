import axiosInstance from '@/lib/axios';
import type {
  GetResponsesParams,
  PaginatedResponsesResult,
  IResponse,
  ResponseDetail,
  ResponseStatus,
} from '@/types/response';

export const responsesService = {
  getResponses: (params: GetResponsesParams) =>
    axiosInstance.get<PaginatedResponsesResult>('/api/responses', { params }).then(r => r.data),

  getResponseById: (id: string) =>
    axiosInstance.get<ResponseDetail>(`/api/responses/${id}`).then(r => r.data),

  updateStatus: (id: string, status: ResponseStatus) =>
    axiosInstance.patch<IResponse>(`/api/responses/${id}`, { status }).then(r => r.data),

  deleteResponse: (id: string) =>
    axiosInstance.delete(`/api/responses/${id}`).then(() => undefined),

  getFileDownloadUrl: (responseId: string, fileId: string) =>
    axiosInstance.get<{ url: string }>(`/api/responses/${responseId}/file/${fileId}`).then(r => r.data),
};
