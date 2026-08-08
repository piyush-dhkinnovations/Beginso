import axiosInstance from '@/lib/axios';
import type { DashboardActivity, DashboardAnalytics } from '@/types/dashboard';

interface DashboardAnalyticsEnvelope {
  success?: boolean;
  analytics?: unknown;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isActivity(value: unknown): value is DashboardActivity {
  if (!value || typeof value !== 'object') return false;
  const activity = value as Partial<DashboardActivity>;
  return (
    typeof activity.id === 'string' &&
    activity.type === 'response_submitted' &&
    typeof activity.occurredAt === 'string' &&
    typeof activity.responseId === 'string' &&
    !!activity.form &&
    typeof activity.form._id === 'string' &&
    typeof activity.form.title === 'string'
  );
}

function parseAnalytics(value: unknown): DashboardAnalytics {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid dashboard analytics response');
  }

  const analytics = value as Partial<DashboardAnalytics>;
  if (
    !isCount(analytics.totalForms) ||
    !isCount(analytics.publishedForms) ||
    !isCount(analytics.totalResponses) ||
    !isCount(analytics.responsesThisMonth) ||
    !Array.isArray(analytics.recentActivity) ||
    !analytics.recentActivity.every(isActivity)
  ) {
    throw new Error('Invalid dashboard analytics response');
  }

  return {
    totalForms: analytics.totalForms,
    publishedForms: analytics.publishedForms,
    totalResponses: analytics.totalResponses,
    responsesThisMonth: analytics.responsesThisMonth,
    recentActivity: analytics.recentActivity.slice(0, 5),
  };
}

export const dashboardService = {
  getAnalytics: () =>
    axiosInstance
      .get<DashboardAnalyticsEnvelope>('/api/dashboard/analytics')
      .then((response) => parseAnalytics(response.data.analytics)),
};
