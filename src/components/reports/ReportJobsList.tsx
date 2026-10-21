'use client';

import { keepPreviousInScope } from '@/lib/queryOptions';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LockKeyhole, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListFooter } from '@/components/ui/ListFooter';
import { ExportMark } from '@/components/illustrations/ExportMark';
import { useToast } from '@/components/ui/Toast';
import { ReportJobRow } from './ReportJobRow';
import { reportsService } from '@/services/reports';
import { reportKeys } from '@/lib/queryKeys';
import { shouldPollReportJob } from '@/lib/reportPolling';
import type { CreateReportPayload, PaginatedReportsResult, ReportJob, ReportStatus } from '@/types/report';
import type { FormMark } from '@/types/form';

const REPORTS_PAGE_LIMIT = 20;
const POLL_INTERVAL_MS = 5_000;

interface ReportJobsListProps {
  page: number;
  onPageChange: (page: number) => void;
  /** formId -> form title, resolved from the forms list ReportsView already loads for its
   * dropdown — job objects only carry a raw `formId`, never a denormalized title. */
  formTitleById?: Map<string, string>;
  /** formId -> the form's logo/icon (same forms list). */
  formMarkById?: Map<string, FormMark | undefined>;
  /** 'personal' (default) or a workspace slug - Sprint 14, Exports lives inside Insights. */
  scope?: string;
}

export function ReportJobsList({ page, onPageChange, formTitleById = new Map(), formMarkById = new Map(), scope = 'personal' }: ReportJobsListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const previousStatusesRef = useRef<Map<string, ReportStatus>>(new Map());

  const jobsQuery = useQuery({
    queryKey: reportKeys.list(page, scope),
    placeholderData: keepPreviousInScope(reportKeys.list(page, scope)),
    queryFn: async () => {
      const result = await reportsService.getReports({ page, limit: REPORTS_PAGE_LIMIT }, scope);
      // Backfill formId/responseStatus/from/to from whatever this same query already had
      // cached for a given job — the real backend has been observed to sometimes omit these
      // once a job reaches a terminal status, even though they were present earlier for the
      // exact same job (see docs/status/fix-log.md S5-04). Reading+merging against the query's
      // own previous cache entry here (rather than a separate ref) also means this naturally
      // covers the optimistically-inserted job from createReportMutation/retryMutation, since
      // that's what's cached the moment before this poll's response arrives.
      const previous = queryClient.getQueryData<PaginatedReportsResult>(reportKeys.list(page, scope));
      const previousById = new Map((previous?.data ?? []).filter((j) => j._id).map((j) => [j._id, j]));
      return {
        ...result,
        data: result.data.map((job) => {
          const prior = job._id ? previousById.get(job._id) : undefined;
          if (!prior) return job;
          return {
            ...job,
            formId: job.formId ?? prior.formId,
            responseStatus: job.responseStatus ?? prior.responseStatus,
            from: job.from ?? prior.from,
            to: job.to ?? prior.to,
          };
        }),
      };
    },
    refetchInterval: (query) => {
      const jobs = query.state.data?.data ?? [];
      return jobs.some((job) => shouldPollReportJob(job.status)) ? POLL_INTERVAL_MS : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsService.createReport(payload, scope),
    onSuccess: (job, payload) => {
      // Same reasoning as ReportsView's createReportMutation — enrich from the request we know
      // we sent rather than trusting the POST response to echo every field (S5-04).
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
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'export responses', fallback: 'Failed to start report generation. Please try again.' }), 'error'),
    onSettled: () => setRetryingJobId(null),
  });

  // Defensively de-duplicated by _id, keeping the first (newest, since the backend/optimistic
  // prepend both order newest-first) — a duplicate here would otherwise both violate React's key
  // uniqueness and show the same report twice. Jobs with no _id are never treated as duplicates
  // of each other (an empty/undefined id isn't a real shared identity) — collapsing every
  // unidentified job down to one row is exactly the bug this caused before reportsService started
  // adapting the real `id` field, see docs/status/fix-log.md.
  const jobs = useMemo(() => {
    const raw = jobsQuery.data?.data ?? [];
    const seen = new Set<string>();
    const deduped: typeof raw = [];
    for (const job of raw) {
      if (job._id && seen.has(job._id)) continue;
      if (job._id) seen.add(job._id);
      deduped.push(job);
    }
    return deduped;
  }, [jobsQuery.data]);

  // Announce only a completed/failed transition while the page is open (Requirement 13.6) — not
  // every 5s poll tick, which would spam a screen reader with identical "still processing" noise.
  useEffect(() => {
    const previous = previousStatusesRef.current;
    jobs.forEach((job) => {
      const previousStatus = previous.get(job._id);
      if (previousStatus && previousStatus !== job.status) {
        if (job.status === 'completed') toast('Your report is ready to download.', 'success');
        else if (job.status === 'failed') toast('Report generation failed.', 'error');
      }
    });
    previousStatusesRef.current = new Map(jobs.map((job) => [job._id, job.status]));
  }, [jobs, toast]);

  function handleRetry(job: ReportJob) {
    setRetryingJobId(job._id);
    retryMutation.mutate({
      format: job.format,
      formId: job.formId,
      status: job.responseStatus,
      from: job.from,
      to: job.to,
    });
  }

  const header = (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h2 className="bg-h5 font-bold text-(--text-primary)">Recent exports</h2>
        <p className="bg-body-sm text-(--text-muted)">Your latest report generation history.</p>
      </div>
      <Button
        variant="ghost"
        size="small"
        onClick={() => void jobsQuery.refetch()}
        disabled={jobsQuery.isFetching}
        aria-label="Refresh report list"
      >
        <RefreshCw size={14} className={jobsQuery.isFetching ? 'animate-spin' : undefined} />
      </Button>
    </div>
  );

  if (jobsQuery.isLoading) {
    return (
      <Card padded={false} className="gap-4 overflow-hidden pb-5">
        {header}
        <div className="mx-5 overflow-hidden rounded-lg border border-(--border-default)">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-(--border-subtle) last:border-0 animate-pulse">
              <div className="h-9 w-9 rounded-lg bg-(--bg-sunken) shrink-0" />
              <div className="flex flex-col flex-1 gap-1.5">
                <div className="h-3.5 bg-(--border-default) rounded w-1/3" />
                <div className="h-3 bg-(--bg-sunken) rounded w-1/4" />
              </div>
              <div className="h-5 w-16 bg-(--border-default) rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Sprint 14 (design.md §17 "Permission denied"): a 403 is a lock state with no Retry - retrying cannot help.
  if (jobsQuery.isError && isAxiosError(jobsQuery.error) && jobsQuery.error.response?.status === 403) {
    return (
      <Card padded={false} className="gap-2 overflow-hidden pb-5">
        {header}
        <EmptyState icon={<LockKeyhole />} title="You can't view exports here" description="Ask an Owner or Admin if you need access to this workspace's exports." />
      </Card>
    );
  }

  if (jobsQuery.isError) {
    return (
      <Card padded={false} className="gap-4 overflow-hidden pb-5">
        {header}
        <div role="alert" className="mx-5 flex min-h-28 items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-6">
          <div>
            <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load report jobs</p>
            <p className="mt-1 bg-caption text-(--text-muted)">Please try again.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void jobsQuery.refetch()}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card padded={false} className="gap-2 overflow-hidden pb-5">
        {header}
        <EmptyState icon={<ExportMark />} title="No exports yet" description="Generate your first CSV or PDF export above." />
      </Card>
    );
  }

  // Expired exports are gone for good (the file is deleted) - a wall of disabled rows hides the ones that matter (A9-012).
  const expiredCount = jobs.filter((job) => job.status === 'expired').length;
  const visibleJobs = showExpired ? jobs : jobs.filter((job) => job.status !== 'expired');
  const total = jobsQuery.data?.total ?? jobs.length;
  const limit = jobsQuery.data?.limit ?? REPORTS_PAGE_LIMIT;

  return (
    <Card padded={false} className="gap-4 overflow-hidden pb-5">
      {header}

      <div className="hidden xl:block mx-5 overflow-x-auto rounded-lg border border-(--border-default)">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-(--bg-subtle) border-b border-(--border-default) bg-caption font-semibold text-(--text-muted) uppercase tracking-wider">
              <th className="px-4 py-2.5">Form Title</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Generated On</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((job, index) => (
              // job._id ?? index is a safety net, not the primary key source — reportsService now
              // adapts the real backend `id` field (see docs/status/fix-log.md S5-03), so _id is
              // populated in the normal case; this only protects against an unexpected future gap.
              <ReportJobRow key={job._id ?? index} job={job} onRetry={handleRetry} isRetrying={retryingJobId === job._id} formTitleById={formTitleById} formMarkById={formMarkById} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="xl:hidden mx-5 flex flex-col gap-3">
        {visibleJobs.map((job, index) => (
          <ReportJobRow key={job._id ?? index} job={job} onRetry={handleRetry} isRetrying={retryingJobId === job._id} formTitleById={formTitleById} formMarkById={formMarkById} variant="card" />
        ))}
      </div>

      {expiredCount > 0 && (
        <div className="px-5">
          <Button variant="ghost" size="small" aria-expanded={showExpired} onClick={() => setShowExpired((v) => !v)}>
            {showExpired ? 'Hide expired exports' : `Show ${expiredCount} expired ${expiredCount === 1 ? 'export' : 'exports'}`}
          </Button>
        </div>
      )}

      <div className="px-5">
        <ListFooter page={page} pageSize={limit} total={total} noun="export" onPageChange={onPageChange} />
      </div>
    </Card>
  );
}
