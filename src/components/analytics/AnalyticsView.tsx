'use client';

import { keepPreviousInScope } from '@/lib/queryOptions';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
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
import dynamic from 'next/dynamic';

// Pulls in dnd-kit; only form analytics (not the all-forms view) renders it.
const CustomChartsSection = dynamic(() => import('./CustomChartsSection').then((m) => m.CustomChartsSection), { ssr: false });
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { canEditCharts } from '@/lib/roles';
import { useAnalyticsTrend } from '@/hooks/useAnalyticsTrend';
import { formsService } from '@/services/forms';
import { useFormScope } from '@/hooks/useFormScope';
import { analyticsService } from '@/services/analytics';
import { analyticsKeys, chartKeys } from '@/lib/queryKeys';
import { chartsService } from '@/services/charts';
import { ALL_TIME_SENTINEL, resolveEffectiveDateRange, resolveTrendBucket, resolvePreviousDateRange } from '@/lib/dateRange';
import { computeChangePercent } from '@/lib/analyticsChange';
import { browserTimezone } from '@/lib/calendarDates';
import { FORM_SUBHEADER_SLOT_ID } from '@/lib/formHeaderSlot';
import {
  parseStoredRange,
  rangeToStored,
  readStoredRangeRaw,
  storedRangeKey,
  storedToRange,
  subscribeStoredRange,
  writeStoredRange,
} from '@/lib/storedDateRange';

// Never changes: the header's slot is looked up once, in the DOM, and the page waits for hydration before using it.
const subscribeNever = () => () => {};

// ponytail: workspace-wide summary cards sum totalResponses across whatever page this fetches,
// not a dedicated backend aggregate — accurate as long as the workspace has <= this many forms.
// Upgrade path: a real aggregate endpoint (or summing across all pages) once that stops holding.
const FORMS_SUMMARY_LIMIT = 100;

interface AnalyticsViewProps {
  /** Undefined for the workspace-wide view reached from the sidebar's "Insights" link. */
  formId?: string;
  /** Workspace-wide view only: 'personal' (default) or a workspace slug — the Insights page passes its own. */
  scope?: string;
  /** Page title; the workspace Insights page says "Insights". */
  title?: string;
}

export function AnalyticsView({ formId, scope = 'personal', title = 'Insights' }: AnalyticsViewProps) {
  const isWorkspaceScope = scope !== 'personal';
  const router = useRouter();
  const formScope = useFormScope(formId ?? '');
  const [addChartOpen, setAddChartOpen] = useState(false);
  const canAddChart = canEditCharts(useWorkspaceRole(formScope ?? 'personal'));
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Which range applies: the one in the URL (a shared or restored link says what it means); else the one this person last chose on
  // this page, kept in the browser; else All time.
  const storageKey = storedRangeKey(formId, scope);
  const storedRaw = useSyncExternalStore(subscribeStoredRange, () => readStoredRangeRaw(storageKey), () => null);
  const stored = parseStoredRange(storedRaw);
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');
  const hasUrlRange = urlFrom !== null || urlTo !== null;
  const { from, to, preset } = hasUrlRange || !stored ? resolveEffectiveDateRange(urlFrom, urlTo) : storedToRange(stored);
  const isAllTime = preset === 'all';
  // Sprint 14 (requirements 1.3): "Compare to previous period" - drives every delta line. Defaults on
  // (that is what the page already showed); off skips the previous-period queries entirely. Remembered with the range.
  const compare = stored?.compare ?? true;

  const rangeHref = (next: { from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', next.from ?? ALL_TIME_SENTINEL);
    params.set('to', next.to ?? ALL_TIME_SENTINEL);
    params.delete('page'); // a different range is a different list: back to its first page
    return `${pathname}?${params.toString()}`;
  };
  const applyRange = (next: { from?: string; to?: string }) => {
    // Remembered at once, so leaving before the URL has caught up still finds the choice.
    writeStoredRange(storageKey, rangeToStored(next, compare));
    router.replace(rangeHref(next));
  };
  function setCompare(next: boolean) {
    writeStoredRange(storageKey, rangeToStored({ from, to }, next));
  }

  // Remember what is showing, so leaving this page and coming back finds it the same.
  useEffect(() => {
    if (hasUrlRange) writeStoredRange(storageKey, rangeToStored({ from, to }, compare));
  }, [hasUrlRange, from, to, compare, storageKey]);

  // Coming back with a bare URL and a remembered range: put it in the URL, so everything that reads the URL (a chart's own date
  // filter, links) agrees with the page. The data above already uses it, so nothing is fetched twice.
  const restoreHref = !hasUrlRange && stored && stored.preset !== 'all' ? rangeHref({ from, to }) : null;
  useEffect(() => {
    if (restoreHref) router.replace(restoreHref);
  }, [restoreHref, router]);

  // The form header's slot for this page's own controls (Filters, Add chart), so they share its row.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const headerSlot = useSyncExternalStore(subscribeNever, () => document.getElementById(FORM_SUBHEADER_SLOT_ID), () => null);
  const defaultBucket = resolveTrendBucket(from, to);
  const [bucketOverride, setBucketOverride] = useState<TrendBucket | null>(null);
  const bucket: TrendBucket = bucketOverride ?? defaultBucket;
  const timezone = browserTimezone();
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

  // Same key as CustomChartsSection's list query, so this shares its cache entry (no extra request).
  const chartsQuery = useQuery({
    queryKey: chartKeys.list(formScope ?? '', formId ?? ''),
    queryFn: () => chartsService.list(formId as string, formScope as string),
    enabled: !!formId && !!formScope,
  });
  const chartedFieldIds = new Set((chartsQuery.data ?? []).map((c) => c.fieldId));

  const formsSummaryQuery = useQuery({
    queryKey: analyticsKeys.formsSummary(range, page, scope),
    queryFn: () => analyticsService.getFormsSummary({ from, to, page, limit: FORMS_SUMMARY_LIMIT }, scope),
    placeholderData: keepPreviousInScope(analyticsKeys.formsSummary(range, page, scope)),
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
    applyRange({});
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
            ? "You don't have permission to view this form's insights."
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
        <DateRangeFilter part="presets" value={{ from, to }} onChange={applyRange} />
        <DateRangeFilter part="range" value={{ from, to }} onChange={applyRange} />
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
              aria-label="Open a form's insights"
              value=""
              onChange={(e) => e.target.value && router.push(`/forms/${e.target.value}/insights${isWorkspaceScope ? `?ws=${scope}` : ''}`)}
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

  const formControls = (
    <div className="ml-auto flex flex-wrap items-center gap-3">
      {filterPopover}
      {canAddChart && (
        <Button size="small" onClick={() => setAddChartOpen(true)}>
          <Plus size={14} className="mr-1.5" aria-hidden="true" />
          Add chart
        </Button>
      )}
    </div>
  );

  return (
    // No animate-fade-in here: an opacity animation makes this a stacking context, which traps the position:fixed
    // ResponseDrawer (opened from a chart's drill panel) under the top bar, hiding its header. ResponsesHubView does the same.
    <div className={formId ? 'flex flex-col gap-6' : 'flex flex-col gap-4'}>
      {formId ? (
        // Inside a form the shared form header already names the form and the tab, so there is no second page title or
        // second row of buttons here: Filters and Add chart go into the header's second row (beside the Insights / Responses
        // switch). Only when the header is not on the page do they sit in a row of their own.
        <>
          <h1 className="sr-only">{title}</h1>
          {!isFirstRun &&
            (headerSlot ? (
              createPortal(formControls, headerSlot)
            ) : hydrated ? (
              <div className="flex flex-wrap items-center justify-end gap-3">{formControls}</div>
            ) : null)}
        </>
      ) : (
        <PageHeader
          title={title}
          description="See how every form in your workspace is performing."
          actionsAlign="center"
          actions={
            isFirstRun ? undefined : (
              <div className="flex flex-wrap items-center gap-3">
                {filterPopover}
              </div>
            )
          }
        />
      )}

      <OfflineBanner />

      {isFirstRun ? (
        <EmptyState
          illustration="empty-reports"
          icon={<FileText />}
          title={formId ? 'No responses yet' : 'No forms yet'}
          description={
            formId
              ? 'Responses will appear here once your form starts receiving submissions.'
              : 'Create a form to start seeing its insights here.'
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
              charts: overviewQuery.data && overviewQuery.data.totalResponses === 0 ? (
                // One message instead of two empty chart boxes saying the same thing.
                <EmptyState
                  icon={<FileText />}
                  title="No responses in this range"
                  description={isAllTime ? 'Charts appear once this form receives responses.' : 'Try a wider date range to see responses outside this window.'}
                  actions={isAllTime ? undefined : <Button variant="secondary" size="small" onClick={widenRange}>Widen the date range</Button>}
                />
              ) : (
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
                  chartedFieldIds={chartedFieldIds}
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
