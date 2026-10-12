import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { DashboardActivity, DashboardAnalytics, ResponseLocation } from '@/types/dashboard';

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

function isLocation(value: unknown): value is ResponseLocation {
  if (!value || typeof value !== 'object') return false;
  const l = value as Partial<ResponseLocation>;
  return (
    typeof l.country === 'string' &&
    typeof l.lat === 'number' && Number.isFinite(l.lat) && Math.abs(l.lat) <= 90 &&
    typeof l.lng === 'number' && Number.isFinite(l.lng) && Math.abs(l.lng) <= 180 &&
    isCount(l.count)
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
    // Optional and filtered: a missing or malformed list just means no map data, never a broken dashboard.
    locations: Array.isArray(analytics.locations) ? analytics.locations.filter(isLocation) : undefined,
  };
}

const fetchAnalytics = (scope: string) =>
  axiosInstance
    .get<DashboardAnalyticsEnvelope>('/api/dashboard/analytics', { headers: workspaceHeaders(scope) })
    .then((response) => parseAnalytics(response.data.analytics));

export const dashboardService = {
  // Personal Home only: explicit 'personal' scope so the backend never falls back to the user's default workspace.
  getAnalytics: () => fetchAnalytics('personal'),
  // A workspace Home (by slug).
  getWorkspaceAnalytics: (slug: string) => fetchAnalytics(slug),
};
