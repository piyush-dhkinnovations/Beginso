'use client';

import { isAxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { searchService } from '@/services/search';
import { searchKeys } from '@/lib/queryKeys';

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 100;
const DEBOUNCE_MS = 250;

/**
 * Sprint 14 (B10, task 3.7) - the only caller of `searchService`. Debounced 250 ms, runs only at >= 2
 * characters, and aborts a stale request when the key changes (TanStack passes the AbortSignal
 * through). The key is namespaced by context so switching workspace never serves another's results;
 * `searchKeys.all` is cleared on context switch and on a role change (GlobalSearch / the switcher).
 * The server filters by permission - nothing is filtered or remembered here.
 */
export function useGlobalSearch(scope: string, rawQuery: string) {
  const debounced = useDebounce(rawQuery.trim().slice(0, SEARCH_MAX_CHARS), DEBOUNCE_MS);
  const enabled = debounced.length >= SEARCH_MIN_CHARS;
  const query = useQuery({
    queryKey: searchKeys.results(scope, debounced),
    queryFn: ({ signal }) => searchService.search(debounced, scope, signal),
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,
    // 400/403/429 will not improve by retrying immediately.
    retry: (count, error) => count < 1 && !(isAxiosError(error) && [400, 403, 429].includes(error.response?.status ?? 0)),
  });
  // `pending` covers the debounce gap too, so the UI does not flash "no results" before the request starts.
  const pending = rawQuery.trim().length >= SEARCH_MIN_CHARS && (rawQuery.trim() !== debounced || query.isFetching);
  return { debouncedQuery: debounced, enabled, pending, ...query };
}
