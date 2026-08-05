import axiosInstance from '@/lib/axios';
import type {
  GetResponsesParams,
  PaginatedResponsesResult,
  IResponse,
  IResponseFile,
  ResponseDetail,
  ResponseStatus,
} from '@/types/response';

// Wire shapes from docs/backend-contract/api-reference.md §3 — every response is wrapped
// in `{ success, ... }`, and the detail endpoint nests under `response` with a snake_case
// `response_files` array. These interfaces exist only to type the raw payload before it's
// adapted into this app's `IResponse`/`ResponseDetail` shape.
interface RawResponseDetail extends IResponse {
  response_files: IResponseFile[];
}
interface ListEnvelope extends PaginatedResponsesResult {
  success: boolean;
}
interface DetailEnvelope {
  success: boolean;
  response: RawResponseDetail;
}
interface UpdateStatusEnvelope {
  success: boolean;
  message: string;
  response: Pick<IResponse, '_id' | 'status' | 'updatedAt'>;
}
interface FileUrlEnvelope {
  success: boolean;
  url: string;
}

function toResponseDetail(raw: RawResponseDetail): ResponseDetail {
  const { response_files, ...rest } = raw;
  return { ...rest, responseFiles: response_files };
}

export const responsesService = {
  getResponses: (params: GetResponsesParams) =>
    axiosInstance
      .get<ListEnvelope>('/api/responses', { params })
      .then((r): PaginatedResponsesResult => {
        const { data, total, page, limit, totalPages } = r.data;
        return { data, total, page, limit, totalPages };
      }),

  getResponseById: (id: string) =>
    axiosInstance.get<DetailEnvelope>(`/api/responses/${id}`).then((r) => toResponseDetail(r.data.response)),

  updateStatus: (id: string, status: ResponseStatus) =>
    axiosInstance
      .patch<UpdateStatusEnvelope>(`/api/responses/${id}`, { status })
      .then((r) => r.data.response),

  deleteResponse: (id: string) =>
    axiosInstance.delete(`/api/responses/${id}`).then(() => undefined),

  getFileDownloadUrl: (responseId: string, fileId: string) =>
    axiosInstance
      .get<FileUrlEnvelope>(`/api/responses/${responseId}/file/${fileId}`)
      .then((r) => ({ url: r.data.url })),
};
