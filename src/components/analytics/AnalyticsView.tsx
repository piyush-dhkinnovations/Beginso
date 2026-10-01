'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { DateRangeFilter } from './DateRangeFilter';
import { AnalyticsStatCards } from './AnalyticsStatCards';
import { TrendChart } from './TrendChart';
import { StatusDistributionChart } from './StatusDistributionChart';
import { QuestionBreakdownSection } from './QuestionBreakdownSection';
import { FormsSummaryTable } from './FormsSummaryTable';
import { WorkspaceSummaryCards } from './WorkspaceSummaryCards';
import { formsService } from '@/services/forms';
import { analyticsService } from '@/services/analytics';
import { analyticsKeys } from '@/lib/queryKeys';
import { resolveEffectiveDateRange, resolveTrendBucket, resolvePreviousDateRange } from '@/lib/dateRange';
import { computeChangePercent } from '@/lib/analyticsChange';

// ponytail: workspace-wide summary cards sum totalResponses across whatever page this fetches,
// not a dedicated backend aggregate — accurate as long as the workspace has <= this many forms.
// Upgrade path: a real aggregate endpoint (or summing across all pages) once that stops holding.
const FORMS_SUMMARY_LIMIT = 100;

interface AnalyticsViewProps {
  /** Undefined for the workspace-wide view reached from the sidebar's "Analytics" link. */
  formId?: string;
}

export function AnalyticsView({ formId }: AnalyticsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { from, to, preset } = resolveEffectiveDateRange(searchParams.get('from'), searchParams.get('to'));
  const isAllTime = preset === 'all';
  const bucket = resolveTrendBucket(from, to);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const range = { from, to };

  const rawPage = Number(searchParams.get('page'));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  const {
    data: form,
    error: formError,
    isError: isFormError,
    refetch: refetchForm,
  } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  const overviewQuery = useQuery({
    queryKey: analyticsKeys.overview(formId as string, range),
    queryFn: () => analyticsService.getOverview({ formId, from, to, timezone }),
    enabled: !!formId,
  });

  const trendsQuery = useQuery({
    queryKey: analyticsKeys.trends(formId as string, range, bucket),
    queryFn: () => analyticsService.getTrends({ formId, from, to, timezone, bucket }),
    enabled: !!formId,
  });

  const questionsQuery = useQuery({
    queryKey: analyticsKeys.questions(formId as string, range),
    queryFn: () => analyticsService.getQuestions({ formId, from, to, timezone }),
    enabled: !!formId,
  });

  const formsSummaryQuery = useQuery({
    queryKey: analyticsKeys.formsSummary(range, page),
    queryFn: () => analyticsService.getFormsSummary({ from, to, page, limit: FORMS_SUMMARY_LIMIT }),
    enabled: !formId,
  });

  // "vs previous period" for the workspace summary cards and the table's Change column — no
  // dedicated backend field for this, so it's computed by querying the same already-live
  // /api/analytics/forms endpoint a second time for the immediately preceding, equal-length
  // window. "All time" has no meaningful predecessor (Requirement-less UX call, not a spec item).
  const previousRange = resolvePreviousDateRange(from, to);
  const hasPreviousRange = !!previousRange.from && !!previousRange.to;

  const previousFormsSummaryQuery = useQuery({
    queryKey: analyticsKeys.formsSummary(previousRange, 1),
    queryFn: () => analyticsService.getFormsSummary({ from: previousRange.from, to: previousRange.to, page: 1, limit: FORMS_SUMMARY_LIMIT }),
    enabled: !formId && hasPreviousRange,
  });

  const currentForms = formsSummaryQuery.data?.forms ?? [];
  const workspaceTotalResponses = currentForms.reduce((sum, f) => sum + f.totalResponses, 0);
  const workspaceActiveForms = currentForms.filter((f) => f.status === 'published').length;
  const workspaceAverageResponsesPerForm = currentForms.length > 0 ? workspaceTotalResponses / currentForms.length : 0;
  const previousWorkspaceTotalResponses = (previousFormsSummaryQuery.data?.forms ?? []).reduce((sum, f) => sum + f.totalResponses, 0);
  const workspaceChangePercent = hasPreviousRange
    ? computeChangePercent(workspaceTotalResponses, previousWorkspaceTotalResponses)
    : null;

  // First run: nothing to analyse yet (no forms, or the form has no responses at all) across all
  // time. The summary cards, date filter and charts would all show zeros, so only an empty state is shown.
  const isFirstRun = formId
    ? !!overviewQuery.data && overviewQuery.data.totalResponses === 0 && isAllTime
    : !!formsSummaryQuery.data && currentForms.length === 0 && isAllTime;

  if (isFormError && formId) {
    const statusCode = isAxiosError(formError) ? formError.response?.status : undefined;
    const isAccessDenied = statusCode === 403;
    const isNotFound = statusCode === 404;
    return (
      <EmptyState illustration={isAccessDenied ? 'no-access' : isNotFound ? 'not-found' : 'error'}
        icon={isAccessDenied ? <LockKeyhole /> : isNotFound ? <FileText /> : <AlertCircle />}
        title={isAccessDenied ? 'Access denied' : isNotFound ? 'Form not found' : 'Unable to load form'}
        description={
          isAccessDenied
            ? "You don't have permission to view this form's analytics."
            : isNotFound
              ? "This form doesn't exist or may have been deleted."
              : 'Something went wrong while loading this form.'
        }
        actions={
          isAccessDenied || isNotFound ? (
            <Button onClick={() => router.push('/forms')}>Go to Forms</Button>
          ) : (
            <Button onClick={() => void refetchForm()}>Try again</Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Analytics"
        description={formId ? `Analytics · ${form?.title ?? ''}` : 'See how every form in your workspace is performing.'}
      />

      {isFirstRun ? (
        <EmptyState
          illustration="empty-reports"
          icon={<FileText />}
          title={formId ? 'No responses yet' : 'No forms yet'}
          description={
            formId
              ? 'Responses will appear here once your form starts receiving submissions.'
              : 'Create a form to start seeing its analytics here.'
          }
          actions={
            formId ? undefined : (
              <Button variant="primary" onClick={() => router.push('/forms')}>
                Go to Forms
              </Button>
            )
          }
        />
      ) : (
        <>
      {!formId && (
        <WorkspaceSummaryCards
          totalResponses={workspaceTotalResponses}
          activeForms={workspaceActiveForms}
          averageResponsesPerForm={workspaceAverageResponsesPerForm}
          changePercent={workspaceChangePercent}
          isLoading={formsSummaryQuery.isLoading}
        />
      )}

      <DateRangeFilter />

      {formId ? (
        <>
          <AnalyticsStatCards
            overview={overviewQuery.data}
            isLoading={overviewQuery.isLoading}
            isError={overviewQuery.isError}
            onRetry={() => void overviewQuery.refetch()}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4">
            <TrendChart
              data={trendsQuery.data}
              isLoading={trendsQuery.isLoading}
              isError={trendsQuery.isError}
              onRetry={() => void trendsQuery.refetch()}
              isAllTime={isAllTime}
            />

            <StatusDistributionChart
              overview={overviewQuery.data}
              isLoading={overviewQuery.isLoading}
              isError={overviewQuery.isError}
              onRetry={() => void overviewQuery.refetch()}
              isAllTime={isAllTime}
            />
          </div>

          <QuestionBreakdownSection
            form={form}
            breakdown={questionsQuery.data?.questions}
            isLoading={questionsQuery.isLoading}
            isError={questionsQuery.isError}
            onRetry={() => void questionsQuery.refetch()}
          />
        </>
      ) : (
        <FormsSummaryTable
          data={formsSummaryQuery.data}
          previousForms={previousFormsSummaryQuery.data?.forms}
          isLoading={formsSummaryQuery.isLoading}
          isError={formsSummaryQuery.isError}
          onRetry={() => void formsSummaryQuery.refetch()}
          page={page}
          onPageChange={goToPage}
        />
      )}
        </>
      )}
    </div>
  );
}
