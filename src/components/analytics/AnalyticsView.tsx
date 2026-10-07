'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { DateRangeFilter } from './DateRangeFilter';
import { FilterPopover } from './FilterPopover';
import { AnalyticsStatCards } from './AnalyticsStatCards';
import { TrendChart } from './TrendChart';
import { StatusDistributionChart } from './StatusDistributionChart';
import { QuestionBreakdownSection } from './QuestionBreakdownSection';
import { FormsSummaryTable } from './FormsSummaryTable';
import { FormsByStatusCard } from './FormsByStatusCard';
import { ResponsesOverTimeCard, type TrendBucket } from './ResponsesOverTimeCard';
import { WorkspaceSummaryCards } from './WorkspaceSummaryCards';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { TemplateDashboard } from './TemplateDashboard';
import { CustomChartsSection } from './CustomChartsSection';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { canEditCharts } from '@/lib/roles';
import { useAnalyticsTrend } from '@/hooks/useAnalyticsTrend';
import { formsService } from '@/services/forms';
import { useFormScope } from '@/hooks/useFormScope';
import { analyticsService } from '@/services/analytics';
import { analyticsKeys } from '@/lib/queryKeys';
import { ALL_TIME_SENTINEL, resolveEffectiveDateRange, resolveTrendBucket, resolvePreviousDateRange } from '@/lib/dateRange';
import { computeChangePercent } from '@/lib/analyticsChange';

// ponytail: workspace-wide summary cards sum totalResponses across whatever page this fetches,
// not a dedicated backend aggregate — accurate as long as the workspace has <= this many forms.
// Upgrade path: a real aggregate endpoint (or summing across all pages) once that stops holding.
const FORMS_SUMMARY_LIMIT = 100;

interface AnalyticsViewProps {
  /** Undefined for the workspace-wide view reached from the sidebar's "Analytics" link. */
  formId?: string;
  /** Workspace-wide view only: 'personal' (default) or a workspace slug — the Insights page passes its own. */
  scope?: string;
  /** Page title; the workspace Insights page says "Insights". */
  title?: string;
}

export function AnalyticsView({ formId, scope = 'personal', title = 'Analytics' }: AnalyticsViewProps) {
  const isWorkspaceScope = scope !== 'personal';
  const router = useRouter();
  const formScope = useFormScope(formId ?? '');
  const [addChartOpen, setAddChartOpen] = useState(false);
  const canAddChart = canEditCharts(useWorkspaceRole(formScope ?? 'personal'));
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { from, to, preset } = resolveEffectiveDateRange(searchParams.get('from'), searchParams.get('to'));
  const isAllTime = preset === 'all';
  const defaultBucket = resolveTrendBucket(from, to);
  const [bucketOverride, setBucketOverride] = useState<TrendBucket | null>(null);
  const bucket: TrendBucket = bucketOverride ?? defaultBucket;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const range = { from, to };
  // Sprint 14 (requirements 1.3): "Compare to previous period" - drives every delta line. Defaults on
  // (that is what the page already showed); off skips the previous-period queries entirely.
  const [compare, setCompare] = useState(true);

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
    queryFn: () => analyticsService.getOverview({ formId, from, to, timezone }, formScope),
    enabled: !!formId && !!formScope,
  });

  const trendsQuery = useQuery({
    queryKey: analyticsKeys.trends(formId as string, range, bucket),
    queryFn: () => analyticsService.getTrends({ formId, from, to, timezone, bucket }, formScope),
    enabled: !!formId && !!formScope,
  });

  const questionsQuery = useQuery({
    queryKey: analyticsKeys.questions(formId as string, range),
    queryFn: () => analyticsService.getQuestions({ formId, from, to, timezone }, formScope),
    enabled: !!formId && !!formScope,
  });

  const formsSummaryQuery = useQuery({
    queryKey: analyticsKeys.formsSummary(range, page, scope),
    queryFn: () => analyticsService.getFormsSummary({ from, to, page, limit: FORMS_SUMMARY_LIMIT }, scope),
    enabled: !formId,
  });

  // "vs previous period" for the workspace summary cards and the table's Change column — no
  // dedicated backend field for this, so it's computed by querying the same already-live
  // /api/analytics/forms endpoint a second time for the immediately preceding, equal-length
  // window. "All time" has no meaningful predecessor (Requirement-less UX call, not a spec item).
  const previousRange = resolvePreviousDateRange(from, to);
  const hasPreviousRange = compare && !!previousRange.from && !!previousRange.to;

  // Per-form: the previous equal-length window's overview, for the stat-card deltas.
  const previousOverviewQuery = useQuery({
    queryKey: analyticsKeys.overview(formId as string, previousRange),
    queryFn: () => analyticsService.getOverview({ formId, from: previousRange.from, to: previousRange.to, timezone }, formScope),
    enabled: !!formId && !!formScope && hasPreviousRange,
  });

  const previousFormsSummaryQuery = useQuery({
    queryKey: analyticsKeys.formsSummary(previousRange, 1, scope),
    queryFn: () => analyticsService.getFormsSummary({ from: previousRange.from, to: previousRange.to, page: 1, limit: FORMS_SUMMARY_LIMIT }, scope),
    enabled: !formId && hasPreviousRange,
  });

  // design.md §17: "no forms yet" and "no responses in this range" are different states - the second
  // keeps the page and offers to widen the range.
  function widenRange() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', ALL_TIME_SENTINEL);
    params.set('to', ALL_TIME_SENTINEL);
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  }

  const currentForms = formsSummaryQuery.data?.forms ?? [];
  const workspaceTotalResponses = currentForms.reduce((sum, f) => sum + f.totalResponses, 0);
  const workspaceActiveForms = currentForms.filter((f) => f.status === 'published').length;
  const workspaceAverageResponsesPerForm = currentForms.length > 0 ? workspaceTotalResponses / currentForms.length : 0;
  const previousWorkspaceTotalResponses = (previousFormsSummaryQuery.data?.forms ?? []).reduce((sum, f) => sum + f.totalResponses, 0);
  const workspaceChangePercent = hasPreviousRange
    ? computeChangePercent(workspaceTotalResponses, previousWorkspaceTotalResponses)
    : null;

  // Workspace view extras: per-form previous-period baselines for every card's change, the daily
  // series behind the charts (see useAnalyticsTrend), and the figures the stat cards show.
  const previousForms = previousFormsSummaryQuery.data?.forms ?? [];
  // Sprint 14 (OQ-3): views-weighted across forms that have a counted views-based rate. Forms
  // with a null rate or no views are left out; if none qualify the result is null ("—"), never 0%.
  const meanCompletion = (list: typeof currentForms) => {
    const counted = list.filter((f) => typeof f.completionRate === 'number' && (f.views ?? 0) > 0);
    const totalViews = counted.reduce((sum, f) => sum + (f.views ?? 0), 0);
    return totalViews > 0 ? counted.reduce((sum, f) => sum + (f.completionRate as number) * (f.views ?? 0), 0) / totalViews : null;
  };
  const workspaceCompletion = meanCompletion(currentForms);
  const previousCompletion = meanCompletion(previousForms);
  const previousAverage = previousForms.length > 0 ? previousWorkspaceTotalResponses / previousForms.length : 0;
  const summaryChanges = {
    responses: workspaceChangePercent,
    average: hasPreviousRange ? computeChangePercent(workspaceAverageResponsesPerForm, previousAverage) : null,
    completion:
      hasPreviousRange && workspaceCompletion !== null && previousCompletion !== null
        ? computeChangePercent(workspaceCompletion, previousCompletion)
        : null,
  };
  const periodLabel = { '7d': 'vs previous 7 days', '30d': 'vs previous 30 days', '90d': 'vs previous 90 days' }[preset as '7d' | '30d' | '90d'] ?? 'vs previous period';
  const workspaceTrend = useAnalyticsTrend({
    from,
    to,
    bucket,
    formIds: currentForms.map((f) => f._id),
    enabled: !formId && formsSummaryQuery.isSuccess && currentForms.length > 0,
    scope,
  });
  const statusCounts = {
    published: currentForms.filter((f) => f.status === 'published').length,
    draft: currentForms.filter((f) => f.status === 'draft').length,
    closed: currentForms.filter((f) => f.status === 'closed').length,
  };

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

  const presetLabel = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time' }[preset as '7d' | '30d' | '90d' | 'all'] ?? 'Custom range';
  const filterPopover = (
    <FilterPopover summary={presetLabel}>
      <div className="flex flex-col gap-2">
        <span className="bg-overline text-(--text-muted)">Date range</span>
        <DateRangeFilter part="presets" />
        <DateRangeFilter part="range" />
      </div>
      <Checkbox
        id="analytics-compare"
        label="Compare to previous period"
        checked={compare}
        onChange={(e) => setCompare(e.target.checked)}
        disabled={isAllTime}
      />
      {!formId && currentForms.length > 0 && (
          <div className="w-48">
            <Select
              id="analytics-jump-form"
              aria-label="Open a form's analytics"
              value=""
              onChange={(e) => e.target.value && router.push(`/forms/${e.target.value}/analytics${isWorkspaceScope ? `?ws=${scope}` : ''}`)}
            >
              <option value="">All forms</option>
              {currentForms.map((f) => (
                <option key={f._id} value={f._id}>{f.title}</option>
              ))}
            </Select>
          </div>
        )}
    </FilterPopover>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title={title}
        description={formId ? `Analytics · ${form?.title ?? ''}` : 'See how every form in your workspace is performing.'}
        actionsAlign="center"
        actions={
          isFirstRun ? undefined : (
            <div className="flex flex-wrap items-center gap-3">
              {filterPopover}
              {formId && canAddChart && (
                <Button size="small" onClick={() => setAddChartOpen(true)}>
                  <Plus size={14} className="mr-1.5" aria-hidden="true" />
                  Add chart
                </Button>
              )}
            </div>
          )
        }
      />

      <OfflineBanner />

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
              <Button variant="primary" onClick={() => router.push(isWorkspaceScope ? `/w/${scope}/forms` : '/forms')}>
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
          totalForms={currentForms.length}
          averageResponsesPerForm={workspaceAverageResponsesPerForm}
          completionRate={workspaceCompletion}
          changes={summaryChanges}
          periodLabel={periodLabel}
          trend={workspaceTrend.points?.map((p) => p.responses)}
          previousTotalResponses={hasPreviousRange ? previousWorkspaceTotalResponses : undefined}
          perFormResponses={currentForms.map((f) => f.totalResponses)}
          isLoading={formsSummaryQuery.isLoading}
        />
      )}

      {!formId && formsSummaryQuery.isSuccess && currentForms.length > 0 && workspaceTotalResponses === 0 && !isAllTime && (
        <Alert variant="info" title="No responses in this range">
          <Button variant="secondary" size="small" onClick={widenRange}>Widen the date range</Button>
        </Alert>
      )}

      {formId ? (
        <>
          <TemplateDashboard
            templateCategory={form?.templateCategory}
            cards={{
              stats: (
                <AnalyticsStatCards
                  overview={overviewQuery.data}
                  isLoading={overviewQuery.isLoading}
                  isError={overviewQuery.isError}
                  onRetry={() => void overviewQuery.refetch()}
                  trend={trendsQuery.data?.points.map((point) => point.responses)}
                  previousOverview={hasPreviousRange ? previousOverviewQuery.data : undefined}
                  periodLabel={periodLabel}
                />
              ),
              charts: (
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
              ),
              questions: (
                <QuestionBreakdownSection
                  form={form}
                  breakdown={questionsQuery.data?.questions}
                  isLoading={questionsQuery.isLoading}
                  isError={questionsQuery.isError}
                  onRetry={() => void questionsQuery.refetch()}
                />
              ),
            }}
          />

          {formScope && (
            <CustomChartsSection
              form={form}
              formId={formId}
              scope={formScope}
              range={range}
              addOpen={addChartOpen}
              onAddClose={() => setAddChartOpen(false)}
              onAddRequest={() => setAddChartOpen(true)}
            />
          )}
        </>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ResponsesOverTimeCard
            points={workspaceTrend.points}
            isLoading={formsSummaryQuery.isLoading || workspaceTrend.isLoading}
            bucket={bucket}
            onBucketChange={setBucketOverride}
          />
          <FormsByStatusCard counts={statusCounts} isLoading={formsSummaryQuery.isLoading} />
        </div>
        <FormsSummaryTable
          data={formsSummaryQuery.data}
          previousForms={previousFormsSummaryQuery.data?.forms}
          isLoading={formsSummaryQuery.isLoading}
          isError={formsSummaryQuery.isError}
          onRetry={() => void formsSummaryQuery.refetch()}
          page={page}
          onPageChange={goToPage}
        />
        </>
      )}
        </>
      )}
    </div>
  );
}
