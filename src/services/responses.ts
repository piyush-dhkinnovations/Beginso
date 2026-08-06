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

// The backend sends each answer twice — once keyed by the field's raw internal id, once by its
// human label, both pointing at the identical value. The internal id shows up as either a
// MongoDB ObjectId (24 hex chars) or a UUID (confirmed 08 Aug 2026 — some fields use one, some
// the other) — strip both key shapes so labels never render as raw ids in the UI.
const OBJECT_ID_KEY_RE = /^[0-9a-f]{24}$/i;
const UUID_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// file_upload answers leak their internal storage reference as the "value" instead of the
// actual submitted text. Confirmed live 08 Aug 2026, two distinct shapes:
//   - a bare object, which React/String() render as the literal text "[object Object]" — but
//     the backend has also been observed sending that exact string directly (already
//     stringified server-side), so both the real object AND the literal string need catching;
//   - a full storage path (multiple ObjectId-shaped segments, a literal "/responses/" segment,
//     then the original filename) — too variable in shape to pattern-match exactly (segment
//     count, filename charset), so this checks for the one substring that's actually stable
//     across every observed example and vanishingly unlikely in real submitted text.
// Neither is meaningful to a reader — the file itself already renders correctly in the
// Attachments list (built from `responseFiles`, not `answers`), so these entries are dropped.
const STORAGE_PATH_MARKER_RE = /\/responses\//i;
function isFileReferenceGarbage(value: ResponseAnswers[string]): boolean {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return true;
  if (typeof value !== 'string') return false;
  return value === '[object Object]' || STORAGE_PATH_MARKER_RE.test(value);
}

function cleanAnswers(answers: ResponseAnswers): ResponseAnswers {
  return Object.fromEntries(
    Object.entries(answers).filter(
      ([key, value]) => !OBJECT_ID_KEY_RE.test(key) && !UUID_KEY_RE.test(key) && !isFileReferenceGarbage(value)
    )
  );
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

  // The URL above still requires the same Bearer auth as the rest of this API — it is NOT a
  // public/pre-signed link despite living on local disk. A direct authenticated fetch to it
  // from the browser fails with a bare CORS network error (confirmed 08 Aug 2026 — no HTTP
  // response reaches axios at all, unlike a plain window.open() there, which gets a real
  // "Unauthorized access to private files" JSON body — proof the host is reachable, just not
  // via a cross-origin XHR/fetch with a custom header). Routed through this app's own
  // `/api/responses/:responseId/file/:fileId` Route Handler instead: that fetch is same-origin
  // (no CORS involved on this leg), and the handler's own server-to-server fetch of the real
  // backend isn't subject to CORS either, since CORS is a browser-only restriction. Result is
  // handed back as a local blob: URL that needs no auth to open — safe for both a forced
  // download and an in-tab preview.
  getFileBlobUrl: async (responseId: string, fileId: string): Promise<string> => {
    const res = await axiosInstance.get<Blob>(
      `${window.location.origin}/api/responses/${responseId}/file/${fileId}`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(res.data);
  },

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
