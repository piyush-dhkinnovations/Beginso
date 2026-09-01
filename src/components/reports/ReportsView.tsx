'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { ReportFormatCard } from './ReportFormatCard';
import { ReportJobsList } from './ReportJobsList';
import { useToast } from '@/components/common/Toast';
import { formsService } from '@/services/forms';
import { reportsService } from '@/services/reports';
import { reportKeys } from '@/lib/queryKeys';
import type { CreateReportPayload, PaginatedReportsResult, ReportFormat, ReportJob } from '@/types/report';
import type { ResponseStatus } from '@/types/response';

const STATUS_OPTIONS: { value: ResponseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const SELECT_CLASS = 'min-h-11 rounded-md border-2 border-neutral-200 bg-white px-3 text-body-sm outline-none focus:border-neutral-500';

export function ReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rawPage = Number(searchParams.get('page'));
  const jobsPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  function goToJobsPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  // Staged, local, non-URL filters (Requirement 9.3) — a report is a one-shot export, not a live
  // view, so none of these fire a request until "Generate" is clicked. `?formId=` only seeds the
  // initial selection on mount (Requirement 9.4), it doesn't keep the form select URL-bound.
  const [formId, setFormId] = useState<string | undefined>(searchParams.get('formId') ?? undefined);
  const [status, setStatus] = useState<ResponseStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const { data: formsData } = useQuery({
    queryKey: ['forms', 'list-for-reports'],
    queryFn: () => formsService.getForms({ limit: 100 }),
  });
  const forms = useMemo(() => formsData?.forms ?? [], [formsData]);
  // The backend's job objects only carry `formId` (a raw ObjectId), never a denormalized
  // `formTitle` — resolved here from the same forms list already loaded for the dropdown above,
  // rather than trusting a field the backend doesn't actually send (see docs/status/fix-log.md).
  const formTitleById = useMemo(() => new Map(forms.map((f) => [f._id, f.title])), [forms]);

  const createReportMutation = useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsService.createReport(payload),
    onSuccess: (job, payload) => {
      // The scope shown in the optimistic row comes from the request we just sent, not from
      // trusting the POST response to echo every field back — we already know for certain what
      // was submitted, and the response's own coverage of these fields has proven inconsistent
      // (see docs/status/fix-log.md S5-04).
      const optimisticJob: ReportJob = {
        ...job,
        formId: job.formId ?? payload.formId,
        responseStatus: job.responseStatus ?? payload.status,
        from: job.from ?? payload.from,
        to: job.to ?? payload.to,
      };
      queryClient.setQueriesData<PaginatedReportsResult>({ queryKey: reportKeys.all }, (old) =>
        old ? { ...old, data: [optimisticJob, ...old.data] } : old
      );
      toast('Report generation started.', 'success');
    },
    onError: () => toast('Failed to start report generation. Please try again.', 'error'),
  });

  function handleGenerate(format: ReportFormat) {
    createReportMutation.mutate({
      format,
      formId,
      status: status === 'all' ? undefined : status,
      from: dateRange.from,
      to: dateRange.to,
    });
  }

  // One shared mutation backs both cards (design.md §10) — disable both while either is in
  // flight rather than tracking per-format state, so a rapid click on the other card can't fire
  // a second concurrent POST the shared mutation object can't cleanly represent.
  const isSubmitting = createReportMutation.isPending;
  const submittingFormat = createReportMutation.variables?.format;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader title="Reports" subtitle="Export your form responses as a CSV or PDF file." />

      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select aria-label="Form" value={formId ?? 'all'} onChange={(e) => setFormId(e.target.value === 'all' ? undefined : e.target.value)} className={SELECT_CLASS}>
            <option value="all">All Forms</option>
            {forms.map((f) => (
              <option key={f._id} value={f._id}>{f.title}</option>
            ))}
          </select>

          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as ResponseStatus | 'all')} className={SELECT_CLASS}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReportFormatCard
          format="csv"
          title="CSV Export"
          description="A spreadsheet-friendly file with every answer, one row per response."
          onGenerate={() => handleGenerate('csv')}
          isLoading={isSubmitting && submittingFormat === 'csv'}
          disabled={isSubmitting}
        />
        <ReportFormatCard
          format="pdf"
          title="PDF Report"
          description="A shareable, print-ready summary of the selected responses."
          onGenerate={() => handleGenerate('pdf')}
          isLoading={isSubmitting && submittingFormat === 'pdf'}
          disabled={isSubmitting}
        />
      </div>

      <ReportJobsList page={jobsPage} onPageChange={goToJobsPage} formTitleById={formTitleById} />
    </div>
  );
}
