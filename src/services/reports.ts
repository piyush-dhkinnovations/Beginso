import axiosInstance from '@/lib/axios';
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
    responseStatus: raw.responseStatus,
    from: raw.from,
    to: raw.to,
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
  reports: RawReportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const reportsService = {
  createReport: (payload: CreateReportPayload): Promise<ReportJob> =>
    axiosInstance.post<RawCreateReportEnvelope>('/api/reports', payload).then((r) => toReportJob(r.data.report)),

  getReports: (params: GetReportsParams): Promise<PaginatedReportsResult> =>
    axiosInstance.get<RawPaginatedReports>('/api/reports', { params }).then((r) => ({
      total: typeof r.data.total === 'number' ? r.data.total : 0,
      page: typeof r.data.page === 'number' ? r.data.page : params.page ?? 1,
      limit: typeof r.data.limit === 'number' ? r.data.limit : params.limit ?? 20,
      totalPages: typeof r.data.totalPages === 'number' ? r.data.totalPages : 1,
      data: Array.isArray(r.data.reports) ? r.data.reports.map(toReportJob) : [],
    })),

  getReportById: (id: string): Promise<ReportJob> =>
    axiosInstance.get<RawReportJob>(`/api/reports/${id}`).then((r) => toReportJob(r.data)),

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
