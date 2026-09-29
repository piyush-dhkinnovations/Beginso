'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { PaginationControls } from '@/components/responses/PaginationControls';
import { useToast } from '@/components/common/Toast';
import { ReportJobRow } from './ReportJobRow';
import { reportsService } from '@/services/reports';
import { reportKeys } from '@/lib/queryKeys';
import { shouldPollReportJob } from '@/lib/reportPolling';
import type { CreateReportPayload, PaginatedReportsResult, ReportJob, ReportStatus } from '@/types/report';

const REPORTS_PAGE_LIMIT = 20;
const POLL_INTERVAL_MS = 5_000;

interface ReportJobsListProps {
  page: number;
  onPageChange: (page: number) => void;
  /** formId -> form title, resolved from the forms list ReportsView already loads for its
   * dropdown — job objects only carry a raw `formId`, never a denormalized title. */
  formTitleById?: Map<string, string>;
}

export function ReportJobsList({ page, onPageChange, formTitleById = new Map() }: ReportJobsListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const previousStatusesRef = useRef<Map<string, ReportStatus>>(new Map());

  const jobsQuery = useQuery({
    queryKey: reportKeys.list(page),
    queryFn: async () => {
      const result = await reportsService.getReports({ page, limit: REPORTS_PAGE_LIMIT });
      // Backfill formId/responseStatus/from/to from whatever this same query already had
      // cached for a given job — the real backend has been observed to sometimes omit these
      // once a job reaches a terminal status, even though they were present earlier for the
      // exact same job (see docs/status/fix-log.md S5-04). Reading+merging against the query's
      // own previous cache entry here (rather than a separate ref) also means this naturally
      // covers the optimistically-inserted job from createReportMutation/retryMutation, since
      // that's what's cached the moment before this poll's response arrives.
      const previous = queryClient.getQueryData<PaginatedReportsResult>(reportKeys.list(page));
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
    mutationFn: (payload: CreateReportPayload) => reportsService.createReport(payload),
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
    onError: () => toast('Failed to start report generation. Please try again.', 'error'),
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
      from: job.from,
      to: job.to,
    });
  }

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-body font-semibold text-neutral-900">Generated Reports</h2>
        <p className="text-caption text-neutral-500">Your recent report generation history.</p>
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
      <div className="flex flex-col gap-4">
        {header}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0 animate-pulse">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 shrink-0" />
              <div className="flex flex-col flex-1 gap-1.5">
                <div className="h-3.5 bg-neutral-200 rounded w-1/3" />
                <div className="h-3 bg-neutral-100 rounded w-1/4" />
              </div>
              <div className="h-5 w-16 bg-neutral-200 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobsQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div role="alert" className="flex min-h-28 items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-6">
          <div>
            <p className="text-body-sm font-semibold text-neutral-900">Unable to load report jobs</p>
            <p className="mt-1 text-caption text-neutral-500">Please try again.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void jobsQuery.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <EmptyState icon={<FileText />} heading="No reports yet" body="Generate your first CSV or PDF export above." />
      </div>
    );
  }

  const total = jobsQuery.data?.total ?? jobs.length;
  const limit = jobsQuery.data?.limit ?? REPORTS_PAGE_LIMIT;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="hidden sm:block bg-white border border-neutral-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-caption font-semibold text-neutral-500 uppercase tracking-wider">
              <th className="px-4 py-2.5">Format</th>
              <th className="px-4 py-2.5">Report</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, index) => (
              // job._id ?? index is a safety net, not the primary key source — reportsService now
              // adapts the real backend `id` field (see docs/status/fix-log.md S5-03), so _id is
              // populated in the normal case; this only protects against an unexpected future gap.
              <ReportJobRow key={job._id ?? index} job={job} onRetry={handleRetry} isRetrying={retryingJobId === job._id} formTitleById={formTitleById} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {jobs.map((job, index) => (
          <ReportJobRow key={job._id ?? index} job={job} onRetry={handleRetry} isRetrying={retryingJobId === job._id} formTitleById={formTitleById} variant="card" />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-caption text-neutral-500">
          Showing {rangeStart} to {rangeEnd} of {total} report{total === 1 ? '' : 's'}
        </p>
        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
