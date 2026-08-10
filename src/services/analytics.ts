import axiosInstance from '@/lib/axios';
import type {
  AnalyticsOverview,
  AnalyticsTrendResult,
  AnalyticsFormsSummaryResult,
  GetAnalyticsParams,
  QuestionBreakdown,
} from '@/types/analytics';

export const analyticsService = {
  getOverview: (params: GetAnalyticsParams): Promise<AnalyticsOverview> =>
    axiosInstance.get<AnalyticsOverview>('/api/analytics/overview', { params }).then((r) => r.data),

  getTrends: (params: GetAnalyticsParams & { bucket: 'day' | 'week' }): Promise<AnalyticsTrendResult> =>
    axiosInstance.get<AnalyticsTrendResult>('/api/analytics/trends', { params }).then((r) => r.data),

  getQuestions: (params: GetAnalyticsParams): Promise<{ questions: QuestionBreakdown[] }> =>
    axiosInstance.get<{ questions: QuestionBreakdown[] }>('/api/analytics/questions', { params }).then((r) => r.data),

  getFormsSummary: (params: { from?: string; to?: string; page?: number; limit?: number }): Promise<AnalyticsFormsSummaryResult> =>
    axiosInstance.get<AnalyticsFormsSummaryResult>('/api/analytics/forms', { params }).then((r) => r.data),
};
