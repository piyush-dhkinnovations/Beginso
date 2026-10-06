'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { ReportFormatCard } from './ReportFormatCard';
import { ReportJobsList } from './ReportJobsList';
import { ReportsSidebar } from './ReportsSidebar';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formsService } from '@/services/forms';
import { reportsService } from '@/services/reports';
import { reportKeys } from '@/lib/queryKeys';
import type { CreateReportPayload, PaginatedReportsResult, ReportFormat, ReportJob } from '@/types/report';

interface ReportsViewProps {
  /** 'personal' (default) or a workspace slug - Sprint 14: Exports lives inside Insights in both contexts. */
  scope?: string;
  /** Rendered inside the Insights Exports tab: the page already has a PageHeader, so this skips its own. */
  embedded?: boolean;
}

export function ReportsView({ scope = 'personal', embedded = false }: ReportsViewProps = {}) {
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
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const { data: formsData } = useQuery({
    queryKey: ['forms', 'list-for-reports', scope],
    // Real bug found and fixed: unscoped, so this dropdown could silently include a caller's
    // workspace forms depending on their default-workspace resolution (src/services/forms.ts's
    // own comment has the full root-cause). This component only renders under (user)/reports
    // today (no /w/[slug]/reports route exists yet), so 'personal' is unconditionally correct —
    // revisit if/when Reports gets a workspace-scoped route.
    // Sprint 14: scoped to the active context - a workspace export only offers that workspace's forms.
    queryFn: () => formsService.getForms({ limit: 100 }, scope === 'personal' ? { type: 'personal' } : { type: 'workspace', workspaceId: scope }),
  });
  const forms = useMemo(() => formsData?.forms ?? [], [formsData]);
  // The backend's job objects only carry `formId` (a raw ObjectId), never a denormalized
  // `formTitle` — resolved here from the same forms list already loaded for the dropdown above,
  // rather than trusting a field the backend doesn't actually send (see docs/status/fix-log.md).
  const formTitleById = useMemo(() => new Map(forms.map((f) => [f._id, f.title])), [forms]);

  const createReportMutation = useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsService.createReport(payload, scope),
    onSuccess: (job, payload) => {
      // The scope shown in the optimistic row comes from the request we just sent, not from
      // trusting the POST response to echo every field back — we already know for certain what
      // was submitted, and the response's own coverage of these fields has proven inconsistent
      // (see docs/status/fix-log.md S5-04).
      const optimisticJob: ReportJob = {
        ...job,
        formId: job.formId ?? payload.formId,
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
    <div className="flex flex-col gap-4 animate-fade-in">
      {embedded ? null : (
        <PageHeader
          title="Reports"
          description="Export your form responses as a CSV or PDF file."
          actionsAlign="center"
          actions={<DateRangeFilter part="range" value={dateRange} onChange={setDateRange} />}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      {/* Sprint 12 (inbox-collaboration), requirements.md §7.3 #4: the status scope picker is
          removed, not replaced with a stage picker — this view only renders under the personal
          shell today (this file's own comment above), where stages are OQ-9's fixed defaults,
          not a fetchable workspace list. A stage-scoped export picker lands once Reports gets a
          workspace-scoped route (design.md §4's "revisit if/when Reports gets a workspace-scoped
          route"), rather than shipping a picker with no real stage data behind it. */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter part="presets" value={dateRange} onChange={setDateRange} />
        {embedded && <DateRangeFilter part="range" value={dateRange} onChange={setDateRange} />}
        <div className="ml-auto w-52">
          <Select
            id="reports-form"
            aria-label="Form"
            value={formId ?? 'all'}
            onChange={(e) => setFormId(e.target.value === 'all' ? undefined : e.target.value)}
          >
            <option value="all">All Forms</option>
            {forms.map((f) => (
              <option key={f._id} value={f._id}>{f.title}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ReportJobsList page={jobsPage} onPageChange={goToJobsPage} formTitleById={formTitleById} scope={scope} />
        <ReportsSidebar />
      </div>
    </div>
  );
}
