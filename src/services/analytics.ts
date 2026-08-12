import axiosInstance from '@/lib/axios';
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
    // `statusDistribution` duplicates completed/in_progress/new with percentages — the flat
    // fields above are simpler to consume and this app computes its own percentages anyway.
  };
}

function toAnalyticsOverview(raw: RawOverviewEnvelope): AnalyticsOverview {
  return {
    totalResponses: raw.data.total,
    statusCounts: {
      new: raw.data.new,
      in_progress: raw.data.in_progress,
      completed: raw.data.completed,
    },
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
      summary: {
        options?: { label: string; count: number }[];
      };
    }[];
  };
}

function toQuestionBreakdowns(raw: RawQuestionsEnvelope): { questions: QuestionBreakdown[] } {
  return {
    questions: raw.data.questions.map((q) => ({
      fieldId: q.fieldId,
      label: q.label,
      options: (q.summary.options ?? []).map((o) => ({ option: o.label, count: o.count })),
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
    completionRate: number;
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
      completionRate: item.completionRate,
    })),
    total: raw.total,
    page: raw.page,
    limit: raw.limit,
  };
}

export const analyticsService = {
  getOverview: (params: GetAnalyticsParams): Promise<AnalyticsOverview> =>
    axiosInstance.get<RawOverviewEnvelope>('/api/analytics/overview', { params }).then((r) => toAnalyticsOverview(r.data)),

  getTrends: (params: GetAnalyticsParams & { bucket: 'day' | 'week' }): Promise<AnalyticsTrendResult> =>
    axiosInstance.get<RawTrendsEnvelope>('/api/analytics/trends', { params }).then((r) => toAnalyticsTrendResult(r.data)),

  getQuestions: (params: GetAnalyticsParams): Promise<{ questions: QuestionBreakdown[] }> =>
    axiosInstance.get<RawQuestionsEnvelope>('/api/analytics/questions', { params }).then((r) => toQuestionBreakdowns(r.data)),

  getFormsSummary: (params: { from?: string; to?: string; page?: number; limit?: number }): Promise<AnalyticsFormsSummaryResult> =>
    axiosInstance
      .get<RawFormsSummaryEnvelope>('/api/analytics/forms', { params })
      .then((r) => toFormsSummaryResult(r.data)),
};
