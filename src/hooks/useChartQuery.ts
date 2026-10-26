'use client';

import { useQuery } from '@tanstack/react-query';
import { chartBuilderService } from '@/services/chartBuilder';
import { useDebounce } from '@/hooks/useDebounce';
import { keepPreviousInScope } from '@/lib/queryOptions';
import type { ChartQuery, QueryResult } from '@/types/chartBuilder';

/**
 * The answer for a chart that may not be saved yet. The wizard changes the query on every keystroke or click, so the request waits
 * 250 ms for the person to stop, is cancelled if the query changes while it is in flight (React Query hands over an AbortSignal), and the
 * previous chart stays on screen (dimmed by the caller) until the next one arrives: no jump, no flash of a skeleton.
 * How the chart LOOKS (display) is not part of the key: a palette change never asks the server again.
 */
export function useChartQuery(formId: string, scope: string | undefined, query: ChartQuery, enabled = true) {
  const { display: _display, ...counted } = query;
  void _display;
  const settled = useDebounce(JSON.stringify(counted), 250);
  const key = ['chart-query', scope ?? 'pending', formId, settled] as const;
  const result = useQuery<QueryResult>({
    queryKey: key,
    queryFn: ({ signal }) => chartBuilderService.query(formId, JSON.parse(settled) as ChartQuery, scope, signal),
    enabled: enabled && !!scope,
    placeholderData: keepPreviousInScope<QueryResult>(key),
    staleTime: 20_000,
    retry: false,
  });
  // The query on screen is ahead of the one answered while the person is still typing.
  return { ...result, settling: settled !== JSON.stringify(counted) };
}
