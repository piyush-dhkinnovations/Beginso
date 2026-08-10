import axiosInstance from '@/lib/axios';
import type { CreateReportPayload, ReportJob, GetReportsParams, PaginatedReportsResult } from '@/types/report';

export const reportsService = {
  createReport: (payload: CreateReportPayload): Promise<ReportJob> =>
    axiosInstance.post<ReportJob>('/api/reports', payload).then((r) => r.data),

  getReports: (params: GetReportsParams): Promise<PaginatedReportsResult> =>
    axiosInstance.get<PaginatedReportsResult>('/api/reports', { params }).then((r) => r.data),

  getReportById: (id: string): Promise<ReportJob> =>
    axiosInstance.get<ReportJob>(`/api/reports/${id}`).then((r) => r.data),

  // Same pattern as responsesService.getFileBlobUrl — same-origin Route Handler proxy
  // (src/app/api/reports/[reportId]/file/route.ts), never a direct authenticated cross-origin
  // fetch. Result is a local blob: URL that needs no auth to open.
  getReportFileBlobUrl: async (id: string): Promise<string> => {
    const res = await axiosInstance.get<Blob>(
      `${window.location.origin}/api/reports/${id}/file`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(res.data);
  },
};
