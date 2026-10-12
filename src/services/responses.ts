import { isAxiosError } from 'axios';
import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type {
  GetResponsesParams,
  PaginatedResponsesResult,
  IResponse,
  IResponseFile,
  LinkPreview,
  ResponseAnswers,
  ResponseDetail,
  ResponseStats,
  BulkRequest,
  BulkResult,
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
interface UpdateResponseEnvelope {
  success: boolean;
  message: string;
  response: IResponse;
}
interface FileUrlEnvelope {
  success: boolean;
  url: string;
}
// GET /api/responses/stats (design.md §11.2 — Extends). Keeps the legacy new/in_progress/
// completed numeric keys as aliases during the deprecation window; this app reads `byStage`/
// `byCategory` only.
interface StatsEnvelope extends ResponseStats {
  success: boolean;
}

// The backend sends each answer twice — once keyed by the field's raw internal id, once by its
// human label, both pointing at the identical value. The internal id shows up as either a
// MongoDB ObjectId (24 hex chars) or a UUID (observed during Sprint 4 — some fields use one, some
// the other) — strip both key shapes so labels never render as raw ids in the UI.
const OBJECT_ID_KEY_RE = /^[0-9a-f]{24}$/i;
const UUID_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// file_upload answers leak their internal storage reference as the "value" instead of the
// actual submitted text. Observed during Sprint 4 in two distinct shapes:
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

/** PATCH /api/responses/:id body (design.md §11.2 — Extends). `status` is only sent for a
 * personal-shell response's stage change (OQ-9's "fixed default stages" — there is no real Stage
 * document to reference by id there, only the status category); every workspace-scoped caller
 * still sends `stageId`, never `status`. */
export interface UpdateResponsePayload {
  stageId?: string;
  status?: 'new' | 'in_progress' | 'completed';
  assigneeId?: string | null;
  tagIds?: string[];
}

// POST /api/responses/bulk (design.md §11.2, task 2.2): "413 batch over cap (cap stated in
// response)". Surfaced as a typed error rather than a generic axios failure so
// `useInboxMutations`/`BulkActionBar` can show a specific message instead of the default
// "failed to update" toast. `cap` is read defensively — the exact response shape for the cap is
// itself "Backend contract to confirm".
export class BulkBatchLimitError extends Error {
  cap?: number;
  constructor(cap?: number) {
    super(cap ? `Bulk actions are limited to ${cap} responses at a time.` : 'Too many responses selected for one bulk action.');
    this.name = 'BulkBatchLimitError';
    this.cap = cap;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// The personal shell has no Stage documents: PERSONAL_DEFAULT_STAGES use the category slug as the
// stage id. The backend rejects a non-ObjectId `stageId` with 400, so a slug is sent as `status`.
const CATEGORY_SLUGS = new Set(['new', 'in_progress', 'completed']);
function normalizeStageParam(params: GetResponsesParams): GetResponsesParams {
  const { stageId, ...rest } = params;
  if (stageId && CATEGORY_SLUGS.has(stageId)) return { ...rest, status: stageId as GetResponsesParams['status'] };
  return params;
}

export const responsesService = {
  getResponses: (params: GetResponsesParams, scope?: string) =>
    axiosInstance
      .get<ListEnvelope>('/api/responses', { params: normalizeStageParam(params), headers: workspaceHeaders(scope) })
      .then((r): PaginatedResponsesResult => {
        const { data, total, page, limit, totalPages } = r.data;
        // Same defensive-array guard `sharedService`/`formAccessService` already carry
        // (CLAUDE.md's own noted pattern) — the all-forms/no-formId call (zero-forms account)
        // is the case most likely to hit a shape the rest of this endpoint's callers never see;
        // fail to an empty page instead of throwing out of the query function.
        return {
          data: Array.isArray(data) ? data.map((item) => ({ ...item, answers: cleanAnswers(item.answers) })) : [],
          total: typeof total === 'number' ? total : 0,
          page: typeof page === 'number' ? page : params.page ?? 1,
          limit: typeof limit === 'number' ? limit : params.limit ?? 10,
          totalPages: typeof totalPages === 'number' ? totalPages : 1,
        };
      }),

  getResponseById: (id: string, scope?: string) =>
    axiosInstance
      .get<DetailEnvelope>(`/api/responses/${id}`, { headers: workspaceHeaders(scope) })
      .then((r) => toResponseDetail(r.data.response)),

  update: (id: string, payload: UpdateResponsePayload, scope?: string) =>
    axiosInstance
      .patch<UpdateResponseEnvelope>(`/api/responses/${id}`, payload, { headers: workspaceHeaders(scope) })
      // The mutation response carries the raw answers map (label AND field-id keys) - same clean-up as reads.
      .then((r) => (r.data.response?.answers ? { ...r.data.response, answers: cleanAnswers(r.data.response.answers) } : r.data.response)),

  // Sprint 13 (A5.2): "Mark as reviewed" — clears the Edited-after-review flag.
  clearEditedAfterReview: (id: string, scope?: string) =>
    axiosInstance
      .patch<{ cleared?: boolean }>(`/api/responses/${id}/edited-after-review`, { cleared: true }, { headers: workspaceHeaders(scope) })
      .then((r) => ({ cleared: !!r.data?.cleared })),

  // Note: since Sprint 13 the backend moves the response to Trash (still 204) instead of destroying it.
  deleteResponse: (id: string, scope?: string) =>
    axiosInstance.delete(`/api/responses/${id}`, { headers: workspaceHeaders(scope) }).then(() => undefined),

  getFileDownloadUrl: (responseId: string, fileId: string) =>
    axiosInstance
      .get<FileUrlEnvelope>(`/api/responses/${responseId}/file/${fileId}`)
      .then((r) => ({ url: r.data.url })),

  // The URL above still requires the same Bearer auth as the rest of this API — it is NOT a
  // public/pre-signed link despite living on local disk. A direct authenticated fetch to it
  // from the browser fails with a bare CORS network error (observed during Sprint 4 — no HTTP
  // response reaches axios at all, unlike a plain window.open() there, which gets a real
  // "Unauthorized access to private files" JSON body — proof the host is reachable, just not
  // via a cross-origin XHR/fetch with a custom header). Routed through this app's own
  // `/api/responses/:responseId/file/:fileId` Route Handler instead: that fetch is same-origin
  // (no CORS involved on this leg), and the handler's own server-to-server fetch of the real
  // backend isn't subject to CORS either, since CORS is a browser-only restriction. Result is
  // handed back as a local blob: URL that needs no auth to open — safe for both a forced
  // download and an in-tab preview.
  getFileBlob: async (responseId: string, fileId: string): Promise<Blob> => {
    const res = await axiosInstance.get<Blob>(
      `${window.location.origin}/api/responses/${responseId}/file/${fileId}`,
      { responseType: 'blob' }
    );
    return res.data;
  },

  getFileBlobUrl: async (responseId: string, fileId: string): Promise<string> =>
    URL.createObjectURL(await responsesService.getFileBlob(responseId, fileId)),

  // Title/thumbnail for a submitted website. The backend fetches it (SSRF-guarded, cached), never the browser.
  // Read defensively: whatever comes back, the caller always gets at least the URL and its domain.
  getLinkPreview: (url: string, scope?: string): Promise<LinkPreview> =>
    axiosInstance
      .get<{ preview?: Partial<LinkPreview> }>('/api/responses/link-preview', { params: { url }, headers: workspaceHeaders(scope) })
      .then((r) => {
        const p = r.data?.preview ?? {};
        return {
          url: typeof p.url === 'string' ? p.url : url,
          domain: typeof p.domain === 'string' ? p.domain : new URL(url).hostname.replace(/^www\./, ''),
          title: typeof p.title === 'string' ? p.title : undefined,
          siteName: typeof p.siteName === 'string' ? p.siteName : undefined,
          image: typeof p.image === 'string' && p.image.startsWith('https://') ? p.image : undefined,
        };
      }),

  // Sprint 12 (inbox-collaboration), task 2.2: one request per bulk action (B2.1) — never one per
  // id. `previous` comes back only for a reversible action; defensively defaulted to `[]` like
  // every other array field in this file (cleanAnswers' own precedent) since nothing here has
  // been exercised against a live response yet.
  bulk: (request: BulkRequest, scope?: string): Promise<BulkResult> =>
    axiosInstance
      .post('/api/responses/bulk', request, { headers: workspaceHeaders(scope) })
      .then((r) => {
        const raw = unwrapEnvelope<Partial<BulkResult>>(r.data, 'result');
        return {
          succeeded: Array.isArray(raw.succeeded) ? raw.succeeded : [],
          failed: Array.isArray(raw.failed) ? raw.failed : [],
          previous: Array.isArray(raw.previous) ? raw.previous : [],
        };
      })
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 413) {
          const data = err.response.data;
          const cap = isPlainObject(data) && typeof data.cap === 'number' ? data.cap : undefined;
          throw new BulkBatchLimitError(cap);
        }
        throw err;
      }),

  // POST /api/responses/:id/read · /unread (design.md §11.2): "idempotent; GET never mutates."
  markRead: (id: string, read: boolean, scope?: string): Promise<void> =>
    axiosInstance
      .post(`/api/responses/${id}/${read ? 'read' : 'unread'}`, {}, { headers: workspaceHeaders(scope) })
      .then(() => undefined),

  // Sprint 12 (inbox-collaboration), task 1.3: replaces the old 3-request client-side computation
  // with the confirmed-live single GET /api/responses/stats call (closes the known low-severity
  // issue in PROJECT_STATUS.md), extended for stages (design.md §2/§11.2).
  getStats: (formId?: string, scope?: string): Promise<ResponseStats> =>
    axiosInstance
      .get<StatsEnvelope>('/api/responses/stats', { params: { formId }, headers: workspaceHeaders(scope) })
      .then((r): ResponseStats => ({
        total: typeof r.data.total === 'number' ? r.data.total : 0,
        unread: typeof r.data.unread === 'number' ? r.data.unread : 0,
        byStage: Array.isArray(r.data.byStage) ? r.data.byStage : [],
        byCategory: r.data.byCategory ?? { new: 0, in_progress: 0, completed: 0 },
      })),
};
