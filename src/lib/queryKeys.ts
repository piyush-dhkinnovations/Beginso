import type { GetResponsesParams } from '@/types/response';

// formId is optional throughout — omitted formId means the "All Responses" view spanning
// every form in the workspace, keyed under the literal 'all' segment.
export const responseKeys = {
  all: (formId?: string) => ['responses', formId ?? 'all'] as const,
  list: (formId: string | undefined, params: Partial<Omit<GetResponsesParams, 'formId'>>) =>
    ['responses', formId ?? 'all', params] as const,
  detail: (id: string) => ['response', id] as const,
  stats: (formId?: string) => ['responses', formId ?? 'all', 'stats'] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  analytics: () => [...dashboardKeys.all, 'analytics'] as const,
};

export interface AnalyticsRangeParams {
  from?: string;
  to?: string;
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (formId: string, range: AnalyticsRangeParams) =>
    [...analyticsKeys.all, 'overview', formId, range] as const,
  trends: (formId: string, range: AnalyticsRangeParams, bucket: 'day' | 'week') =>
    [...analyticsKeys.all, 'trends', formId, range, bucket] as const,
  questions: (formId: string, range: AnalyticsRangeParams) =>
    [...analyticsKeys.all, 'questions', formId, range] as const,
  formsSummary: (range: AnalyticsRangeParams, page: number) =>
    [...analyticsKeys.all, 'forms', range, page] as const,
};

export const reportKeys = {
  all: ['reports'] as const,
  list: (page: number) => [...reportKeys.all, 'list', page] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  // notificationPreferences lives on the workspace document (confirmed live 18 Aug 2026) — no
  // dedicated query key; NotificationsTab reads/writes via this same key WorkspaceTab/BrandingTab
  // already share.
  workspace: () => [...settingsKeys.all, 'workspace'] as const,
  sessions: () => [...settingsKeys.all, 'sessions'] as const,
};
