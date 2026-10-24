'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormStages, useResponseSetup } from '@/hooks/useResponseSetup';
import { normalizeResponsePage, clampResponsePage } from '@/lib/responseList';
import { applyInboxFilterPatch, normalizeViewMode, parseInboxFiltersFromParams, type InboxViewMode } from '@/lib/inboxFilters';
import type { ResponseFilters } from '@/types/response';

const PAGE_LIMIT = 50;

export interface UseInboxFiltersOptions {
  /** Workspace slug, or 'personal' for the personal shell (OQ-1). */
  scope: string;
  /** The form whose responses these are: its own stages and the view it opens in. Undefined on the all-forms views. */
  formId?: string;
}

/**
 * Sprint 12 (inbox-collaboration), design.md §7 "useInboxFilters" — owns URL ⇄ `ResponseFilters`,
 * normalizes the legacy `?status=` param (held until stages load, per requirements.md §7.1), and
 * exposes the page/view/search state `ResponsesHubView` used to hold inline.
 */
export function useInboxFilters({ scope, formId }: UseInboxFiltersOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stages, isLoading: stagesLoading } = useFormStages(scope === 'personal' ? undefined : scope, formId);
  const { data: setup } = useResponseSetup(formId);
  const defaultView = setup?.setup.opensAs ?? 'table';

  const { filters, legacyStatusPending } = useMemo(
    () => parseInboxFiltersFromParams(searchParams, stages),
    [searchParams, stages]
  );

  const page = normalizeResponsePage(searchParams.get('page'));
  const viewParam = searchParams.get('view');
  const view = viewParam === null ? defaultView : normalizeViewMode(viewParam);
  const PAGE_LIMIT_CONST = PAGE_LIMIT;

  // `shallow` changes the address without asking the server for the page again (Next keeps useSearchParams in step with it). Typing in the
  // search box and picking a filter only change what the browser asks the API for, so they do not need the page round trip a router
  // call makes.
  const replace = useCallback(
    (next: URLSearchParams, shallow = false) => {
      const url = `${pathname}?${next.toString()}`;
      if (shallow && typeof window !== 'undefined') window.history.replaceState(null, '', url);
      else router.replace(url);
    },
    [pathname, router]
  );

  const setFilters = useCallback(
    (patch: Partial<ResponseFilters & { page: number; view: InboxViewMode; search: string }>, opts?: { resetPage?: boolean; shallow?: boolean }) => {
      let next = applyInboxFilterPatch(searchParams, patch, defaultView);
      if (opts?.resetPage && !('page' in patch)) next = applyInboxFilterPatch(next, { page: 1 }, defaultView);
      replace(next, opts?.shallow);
    },
    [replace, searchParams, defaultView]
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
