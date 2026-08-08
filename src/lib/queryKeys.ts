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
