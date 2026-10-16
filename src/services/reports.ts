import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { CreateReportPayload, ReportJob, GetReportsParams, PaginatedReportsResult } from '@/types/report';

// Wire shape observed live 13 Aug 2026 for POST /api/reports: wrapped in
// { success, message, report }, and the job itself is keyed `id`, not `_id` (see
// docs/backend-contract/known-issues/reports-job-id-field-missing.md).
//
// Real bug found and fixed (22 Sep 2026): the note this replaced claimed GET /api/reports' outer
// pagination shape was `{ data, total, page, limit, totalPages }`, "re-verify if that changes" —
// it was never actually that shape. A live capture against a zero-reports account returned
// `{"success":true,"reports":[],"total":0,"page":1,"limit":10,"totalPages":0}` — the array is
// keyed `reports`, not `data`. The old code read `r.data.data`, always `undefined`, so
// `.map()` either threw (surfacing as "Unable to load report jobs" — what actually got reported)
// or, for an account WITH report jobs, would have silently rendered an empty list forever (worse:
// this shape mismatch was never limited to the empty-state case). Corrected to the real key, with
// the same non-array-safe guard as every other service that's already been burned by exactly this
// (`sharedService`'s own `shares` vs `forms` key-name precedent).
interface RawReportJob {
  id: string;
  format: ReportJob['format'];
  status: ReportJob['status'];
  formId?: string;
  formTitle?: string;
  // Sprint 12 (inbox-collaboration), design.md §11.2 — Backend contract to confirm: the stage
  // name snapshot replacing `responseStatus`. Uncertain/not yet live (BE 0.4), so both are read
  // defensively; `responseStatus` stays for a job created before this sprint (OQ-2's alias).
  stage?: ReportJob['stage'];
  responseStatus?: ReportJob['responseStatus'];
  from?: string;
  to?: string;
  // Live shape (captured 16 Oct 2026): the scope a report was created with lives under `filters`, not at the top level.
  filters?: { status?: ReportJob['responseStatus']; from?: string; to?: string; ids?: string[] } | null;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  errorMessage?: string;
}

function toReportJob(raw: RawReportJob): ReportJob {
  return {
    _id: raw.id,
    format: raw.format,
    status: raw.status,
    formId: raw.formId,
    formTitle: raw.formTitle,
    stage: raw.stage,
    responseStatus: raw.responseStatus ?? raw.filters?.status,
    from: raw.from ?? raw.filters?.from,
    to: raw.to ?? raw.filters?.to,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt,
    expiresAt: raw.expiresAt,
    errorMessage: raw.errorMessage,
  };
}

interface RawCreateReportEnvelope {
  success: boolean;
  message: string;
  report: RawReportJob;
}

interface RawPaginatedReports {
  data?: RawReportJob[];
  reports?: RawReportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const reportsService = {
  // Sprint 14 (requirements 1.1): `scope` is 'personal' (default) or a workspace slug - Exports lives
  // inside Insights in both contexts, so every call names its context explicitly.
  createReport: (payload: CreateReportPayload, scope = 'personal'): Promise<ReportJob> =>
    axiosInstance
      .post<RawCreateReportEnvelope>('/api/reports', payload, { headers: workspaceHeaders(scope) })
      .then((r) => toReportJob(r.data.report)),

  // The list array is `data` when the account has jobs but `reports` on the empty-account branch
  // (live, 7 Oct 2026) - accept both rather than trusting either.
  getReports: (params: GetReportsParams, scope = 'personal'): Promise<PaginatedReportsResult> =>
    axiosInstance.get<RawPaginatedReports>('/api/reports', { params, headers: workspaceHeaders(scope) }).then((r) => {
      const raw = r.data;
      const rows = Array.isArray(raw.data) ? raw.data : unwrapEnvelope<RawReportJob[]>(raw, 'reports');
      return {
        total: typeof raw.total === 'number' ? raw.total : 0,
        page: typeof raw.page === 'number' ? raw.page : params.page ?? 1,
        limit: typeof raw.limit === 'number' ? raw.limit : params.limit ?? 20,
        totalPages: typeof raw.totalPages === 'number' ? raw.totalPages : 1,
        data: Array.isArray(rows) ? rows.map(toReportJob) : [],
      };
    }),

  // GET /api/reports/:id wraps the job as `{ success, report }`.
  getReportById: (id: string): Promise<ReportJob> =>
    axiosInstance.get(`/api/reports/${id}`).then((r) => toReportJob(unwrapEnvelope<RawReportJob>(r.data, 'report'))),

  // Same pattern as responsesService.getFileBlobUrl — same-origin Route Handler proxy
  // (src/app/api/reports/[reportId]/file/route.ts), never a direct authenticated cross-origin
  // fetch. Result is a local blob: URL that needs no auth to open. `onProgress` is best-effort —
  // it only fires with a real percentage when the upstream response sent a Content-Length.
  getReportFileBlobUrl: async (id: string, onProgress?: (percent: number) => void): Promise<string> => {
    const res = await axiosInstance.get<Blob>(
      `${window.location.origin}/api/reports/${id}/file`,
      {
        responseType: 'blob',
        onDownloadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      }
    );
    return URL.createObjectURL(res.data);
  },
};
