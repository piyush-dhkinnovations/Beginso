import axiosInstance from '@/lib/axios';
import type {
  GetResponsesParams,
  PaginatedResponsesResult,
  IResponse,
  IResponseFile,
  ResponseAnswers,
  ResponseDetail,
  ResponseStats,
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

// The backend sends each answer twice — once keyed by the field's raw MongoDB ObjectId, once
// by its human label, both pointing at the identical value. Strip the ObjectId-keyed
// duplicates so labels never render as raw hex strings in the UI.
const OBJECT_ID_KEY_RE = /^[0-9a-f]{24}$/i;
function cleanAnswers(answers: ResponseAnswers): ResponseAnswers {
  return Object.fromEntries(Object.entries(answers).filter(([key]) => !OBJECT_ID_KEY_RE.test(key)));
}

function toResponseDetail(raw: RawResponseDetail): ResponseDetail {
  const { response_files, answers, ...rest } = raw;
  return { ...rest, answers: cleanAnswers(answers), responseFiles: response_files };
}

export const responsesService = {
  getResponses: (params: GetResponsesParams) =>
    axiosInstance
      .get<ListEnvelope>('/api/responses', { params })
      .then((r): PaginatedResponsesResult => {
        const { data, total, page, limit, totalPages } = r.data;
        return { data: data.map((item) => ({ ...item, answers: cleanAnswers(item.answers) })), total, page, limit, totalPages };
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

  // GET /api/responses/stats is requested but not yet implemented backend-side (see
  // docs/backend-contract/api-reference.md §3), so counts are computed client-side from the
  // existing list endpoint's `total` — one cheap limit:1 request per status. Swap this for the
  // dedicated endpoint (a single call) once it ships.
  getStats: (formId?: string): Promise<ResponseStats> =>
    Promise.all(
      (['new', 'in_progress', 'completed'] as const).map((status) =>
        axiosInstance
          .get<ListEnvelope>('/api/responses', { params: { formId, status, limit: 1 } })
          .then((r) => r.data.total)
      )
    ).then(([newCount, inProgressCount, completedCount]) => ({
      total: newCount + inProgressCount + completedCount,
      new: newCount,
      in_progress: inProgressCount,
      completed: completedCount,
    })),
};
