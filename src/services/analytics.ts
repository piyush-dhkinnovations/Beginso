import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { StageCategory } from '@/types/stage';
import type {
  AnalyticsOverview,
  AnalyticsFormSummary,
  AnalyticsTrendResult,
  AnalyticsTrendPoint,
  AnalyticsFormsSummaryResult,
  GetAnalyticsParams,
  QuestionBreakdown,
} from '@/types/analytics';

// Wire shapes from the live backend, observed 12 Aug 2026 against a real form with 3 responses —
// every one of these differs from what docs/backend-contract/api-reference.md §4 originally
// proposed (that doc is now corrected to match). These interfaces exist only to type each raw
// payload before adapting it into this app's `src/types/analytics.ts` shapes.

interface RawOverviewEnvelope {
  success: boolean;
  data: {
    total: number;
    completed: number;
    in_progress: number;
    new: number;
    // Sprint 14 (BE 0.2, Backend contract to confirm): views-based, nullable. Read defensively -
    // a missing field stays undefined, never 0.
    completionRate?: number | null;
    reviewedRate?: number | null;
    views?: number | null;
    /** One row per stage that holds responses (empty stages are left out by the backend). */
    stageDistribution?: { stageId: string; name: string; category: StageCategory; count: number }[];
    // `statusDistribution` duplicates completed/in_progress/new with percentages — the flat
    // fields above are simpler to consume and this app computes its own percentages anyway.
  };
}

// Sprint 12 (inbox-collaboration), requirements.md §7.3 #3 / design.md §2: the backend's overview
// response hasn't itself changed shape this sprint (it still reports the fixed three counts, not
// per-stage rows) — only the frontend's field name changes, from `statusCounts` to
// `categoryCounts`, to stop implying these are the removed `status` union rather than the stable
// `category` grouping every custom stage still falls back to.
// Sprint 14 (OQ-3): a rate is a finite number or null - a missing/invalid value is "not enough
// data", never a fabricated 0.
function toRate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toAnalyticsOverview(raw: RawOverviewEnvelope): AnalyticsOverview {
  return {
    totalResponses: raw.data.total,
    categoryCounts: {
      new: raw.data.new,
      in_progress: raw.data.in_progress,
      completed: raw.data.completed,
    },
    completionRate: toRate(raw.data.completionRate),
    reviewedRate: toRate(raw.data.reviewedRate),
    views: typeof raw.data.views === 'number' ? raw.data.views : null,
    // A workspace's own stages (In Review, On Hold, Released...) used to be folded into three category totals and never named.
    ...(Array.isArray(raw.data.stageDistribution) && raw.data.stageDistribution.length > 0
      ? {
          stageCounts: raw.data.stageDistribution
            .filter((s) => s && typeof s.name === 'string' && typeof s.count === 'number')
            .map((s) => ({ stageId: s.stageId, name: s.name, category: s.category, count: s.count })),
        }
      : {}),
  };
}

interface RawTrendsEnvelope {
  success: boolean;
  points: AnalyticsTrendPoint[];
  dateRange: { bucket: 'day' | 'week' };
}

function toAnalyticsTrendResult(raw: RawTrendsEnvelope): AnalyticsTrendResult {
  return { bucket: raw.dateRange.bucket, points: raw.points };
}

interface RawQuestionsEnvelope {
  success: boolean;
  data: {
    questions: {
      fieldId: string;
      label: string;
      type: string;
      totalAnswered?: number;
      summary: {
        options?: { label: string; count: number; percentage?: number }[];
        rating?: QuestionBreakdown['rating'];
        numeric?: QuestionBreakdown['numeric'];
        yesNo?: QuestionBreakdown['yesNo'];
      };
    }[];
  };
}

function toQuestionBreakdowns(raw: RawQuestionsEnvelope): { questions: QuestionBreakdown[] } {
  return {
    questions: raw.data.questions.map((q) => ({
      fieldId: q.fieldId,
      label: q.label,
      type: q.type,
      totalAnswered: q.totalAnswered,
      options: (q.summary.options ?? []).map((o) => ({ option: o.label, count: o.count, percentage: o.percentage })),
      // Only on a backend that sends them (A7-008): an older one simply has none, and those questions stay out of the breakdown.
      ...(q.summary.rating ? { rating: q.summary.rating } : {}),
      ...(q.summary.numeric ? { numeric: q.summary.numeric } : {}),
      ...(q.summary.yesNo ? { yesNo: q.summary.yesNo } : {}),
    })),
  };
}

interface RawFormsSummaryEnvelope {
  success: boolean;
  data: {
    formId: string;
    title: string;
    status: AnalyticsFormSummary['status'];
    totalResponses: number;
    completionRate?: number | null;
    views?: number | null;
    reviewedRate?: number | null;
    templateCategory?: string | null;
    branding?: { logoUrl?: string | null; iconName?: string | null };
  }[];
  total: number;
  page: number;
  limit: number;
}

function toFormsSummaryResult(raw: RawFormsSummaryEnvelope): AnalyticsFormsSummaryResult {
  return {
    forms: raw.data.map((item) => ({
      _id: item.formId,
      title: item.title,
      status: item.status,
      totalResponses: item.totalResponses,
      completionRate: toRate(item.completionRate),
      views: typeof item.views === 'number' ? item.views : null,
      reviewedRate: item.reviewedRate === undefined ? undefined : toRate(item.reviewedRate),
      templateCategory: item.templateCategory ?? null,
      ...(item.branding ? { branding: item.branding } : {}),
    })),
    total: raw.total,
    page: raw.page,
    limit: raw.limit,
  };
}

// Bug fix, Sprint 12 close-out: none of these four calls ever sent a workspace header at all —
// the backend's `getVerifiedWorkspaceId` then fell through its normal header→query→body→"caller's
// default workspace" chain and silently resolved to whatever workspace the caller happens to
// belong to, so the Personal analytics page showed that workspace's forms instead of nothing
// (same root cause as the Inbox personal-shell leak fixed earlier this sprint). Explicit
// 'personal' is unconditionally correct here — no /w/[slug]/analytics route exists yet, same
// reasoning `ReportsView`'s own `formsService.getForms(..., { type: 'personal' })` already
// established for this page family.
export const analyticsService = {
  getOverview: (params: GetAnalyticsParams, scope = 'personal'): Promise<AnalyticsOverview> =>
    axiosInstance
      .get<RawOverviewEnvelope>('/api/analytics/overview', { params, headers: workspaceHeaders(scope) })
      .then((r) => toAnalyticsOverview(r.data)),

  getTrends: (params: GetAnalyticsParams & { bucket: 'day' | 'week' }, scope = 'personal'): Promise<AnalyticsTrendResult> =>
    axiosInstance
      .get<RawTrendsEnvelope>('/api/analytics/trends', { params, headers: workspaceHeaders(scope) })
      .then((r) => toAnalyticsTrendResult(r.data)),

  getQuestions: (params: GetAnalyticsParams, scope = 'personal'): Promise<{ questions: QuestionBreakdown[] }> =>
    axiosInstance
      .get<RawQuestionsEnvelope>('/api/analytics/questions', { params, headers: workspaceHeaders(scope) })
      .then((r) => toQuestionBreakdowns(r.data)),

  // Sprint 13+: `scope` is 'personal' (default, the old behaviour) or a workspace slug for the Insights page.
  getFormsSummary: (params: { from?: string; to?: string; page?: number; limit?: number }, scope = 'personal'): Promise<AnalyticsFormsSummaryResult> =>
    axiosInstance
      .get<RawFormsSummaryEnvelope>('/api/analytics/forms', { params, headers: workspaceHeaders(scope) })
      .then((r) => toFormsSummaryResult(r.data)),
};
