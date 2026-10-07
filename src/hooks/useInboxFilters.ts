'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStages } from '@/hooks/useStages';
import { normalizeResponsePage, clampResponsePage } from '@/lib/responseList';
import { applyInboxFilterPatch, normalizeViewMode, parseInboxFiltersFromParams, type InboxViewMode } from '@/lib/inboxFilters';
import type { ResponseFilters } from '@/types/response';

const PAGE_LIMIT = 50;

export interface UseInboxFiltersOptions {
  /** Workspace slug, or 'personal' for the personal shell (OQ-1). */
  scope: string;
}

/**
 * Sprint 12 (inbox-collaboration), design.md §7 "useInboxFilters" — owns URL ⇄ `ResponseFilters`,
 * normalizes the legacy `?status=` param (held until stages load, per requirements.md §7.1), and
 * exposes the page/view/search state `ResponsesHubView` used to hold inline.
 */
export function useInboxFilters({ scope }: UseInboxFiltersOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: stages, isLoading: stagesLoading } = useStages(scope === 'personal' ? undefined : scope);

  const { filters, legacyStatusPending } = useMemo(
    () => parseInboxFiltersFromParams(searchParams, stages),
    [searchParams, stages]
  );

  const page = normalizeResponsePage(searchParams.get('page'));
  const view = normalizeViewMode(searchParams.get('view'));
  const PAGE_LIMIT_CONST = PAGE_LIMIT;

  const replace = useCallback(
    (next: URLSearchParams) => router.replace(`${pathname}?${next.toString()}`),
    [pathname, router]
  );

  const setFilters = useCallback(
    (patch: Partial<ResponseFilters & { page: number; view: InboxViewMode; search: string }>, opts?: { resetPage?: boolean }) => {
      let next = applyInboxFilterPatch(searchParams, patch);
      if (opts?.resetPage && !('page' in patch)) next = applyInboxFilterPatch(next, { page: 1 });
      replace(next);
    },
    [replace, searchParams]
  );

  const clear = useCallback(() => {
    replace(applyInboxFilterPatch(new URLSearchParams(), { page: 1 }));
  }, [replace]);

  // Normalize an invalid/out-of-shape `?page=` value (NaN, 0, negative, non-integer) back onto
  // the URL immediately — matches the pre-Sprint-12 hub's own behaviour, and keeps the URL
  // reflecting reality rather than silently overriding the request with page=1 while the address
  // bar still shows something else.
  useEffect(() => {
    const rawPage = searchParams.get('page');
    if (rawPage !== null && rawPage !== String(page)) setFilters({ page });
    // setFilters is stable; including it would re-run this effect on every filter change rather
    // than only when the URL's own page value stops matching the normalized one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchParams]);

  // Once stages have loaded, resolve a still-pending legacy `?status=` param to a real `stage=`
  // and drop `status=` from the URL — requirements.md §7.1's "mapped ... not dropped."
  useEffect(() => {
    if (!legacyStatusPending || !stages) return;
    const mapped = stages.find((s) => s.category === legacyStatusPending);
    if (mapped) setFilters({ stageId: mapped.id });
    // setFilters is stable across renders that matter here; including it would re-run this effect
    // on every filter change, not just when the pending legacy param resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyStatusPending, stages]);

  return {
    filters,
    page,
    view,
    search: filters.q ?? '',
    pageLimit: PAGE_LIMIT_CONST,
    stages: stages ?? [],
    stagesLoading,
    legacyStatusPending,
    setFilters,
    setPage: (p: number) => setFilters({ page: p }),
    setView: (v: InboxViewMode) => setFilters({ view: v }),
    clampPage: (totalPages: number) => clampResponsePage(page, totalPages),
    clear,
  };
}
