import axiosInstance from '@/lib/axios';
import type { CreateReportPayload, ReportJob, GetReportsParams, PaginatedReportsResult } from '@/types/report';

// Wire shape observed live 13 Aug 2026 for POST /api/reports: wrapped in
// { success, message, report }, and the job itself is keyed `id`, not `_id` (see
// docs/backend-contract/known-issues/reports-job-id-field-missing.md). GET /api/reports' outer
// pagination shape ({ data, total, page, limit, totalPages }) has behaved consistently with what
// was assumed — a real, multi-job list rendered as one collapsed row rather than zero rows,
// which only happens if `.data` really is the job array — so only each job's own `id` field is
// adapted here, not the outer envelope. Re-verify against a real GET response if that changes.
interface RawReportJob {
  id: string;
  format: ReportJob['format'];
  status: ReportJob['status'];
  formId?: string;
  formTitle?: string;
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
  data: RawReportJob[];
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
      ...r.data,
      data: r.data.data.map(toReportJob),
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
