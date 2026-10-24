'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { keepPreviousInScope } from '@/lib/queryOptions';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import type { useInboxFilters } from '@/hooks/useInboxFilters';

type InboxFilters = ReturnType<typeof useInboxFilters>;

interface Options {
  scope: string;
  formId?: string;
  filters: InboxFilters['filters'];
  page: number;
  pageLimit: number;
  setPage: InboxFilters['setPage'];
  /** Newest first (default) or oldest first, applied by the server across every page. */
  submittedOrder?: 'asc' | 'desc';
  /** A column other than the submission time to sort by (`email`, `q:<fieldId>`); `submittedOrder` is then its direction. */
  sortBy?: string;
}

/** Form, stats and paginated response-list queries, plus the out-of-range page clamp. */
export function useResponsesData({ scope, formId, filters, page, pageLimit, setPage, submittedOrder = 'desc', sortBy }: Options) {
  // Newest first is the server's default, so only an oldest-first order is sent; a column sort always says which way it goes.
  const order = sortBy ? ({ sortBy, order: submittedOrder } as const) : submittedOrder === 'asc' ? ({ order: 'asc' } as const) : {};
  const listKey = responseKeys.list(scope, formId, { ...filters, ...order, page, limit: pageLimit });
  const replacePage = useCallback((nextPage: number) => setPage(nextPage), [setPage]);

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

  const {
    data: stats,
    isLoading: statsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: responseKeys.stats(scope, formId),
    queryFn: () => responsesService.getStats(formId, scope),
  });

  const {
    data,
    isLoading,
    isError: isResponsesError,
    refetch: refetchResponses,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => responsesService.getResponses({ formId, ...filters, ...order, page, limit: pageLimit }, scope),
    placeholderData: keepPreviousInScope(listKey),
    // Polling stays on the list only (design.md §10/§20); must not clear selection or open detail —
    // neither selection nor the drawer's responseId lives in this query, so a refetch can't touch them.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!data) return;
    const clampedPage = Math.min(Math.max(page, 1), Math.max(data.totalPages, 1));
    if (clampedPage !== page) replacePage(clampedPage);
  }, [data, page, replacePage]);

  return { form, formError, isFormError, refetchForm, stats, statsLoading, isStatsError, refetchStats, data, isLoading, isResponsesError, refetchResponses };
}
