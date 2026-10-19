'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { responsesService } from '@/services/responses';
import type { IResponse } from '@/types/response';
import type { useInboxFilters } from '@/hooks/useInboxFilters';

type Filters = ReturnType<typeof useInboxFilters>['filters'];

interface Options {
  scope: string;
  formId?: string;
  filters: Filters;
  /** The table's submission order: stepping to the next/previous response across a page boundary must follow the same order. */
  submittedOrder?: 'asc' | 'desc';
  page: number;
  pageLimit: number;
  data: { data: IResponse[]; totalPages: number; total: number } | undefined;
}

/** The drawer's `?responseId=` URL state: open/close, prev/next across pages, and expand-to-full-page. */
export function useResponseRouting({ scope, formId, filters, page, pageLimit, data, submittedOrder = 'desc' }: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const responseId = searchParams.get('responseId');
  const responses = data?.data ?? [];
  const activeResponseIndex = responseId ? responses.findIndex((response) => response._id === responseId) : -1;
  const activeResponsePosition = activeResponseIndex >= 0 ? (page - 1) * pageLimit + activeResponseIndex + 1 : undefined;

  function openResponse(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('responseId', id);
    // push, not replace — the back button must close the drawer.
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeResponse() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('responseId');
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function navigateResponse(direction: 'previous' | 'next') {
    if (activeResponseIndex < 0 || !data) return;

    let targetPage = page;
    let target: IResponse | undefined = responses[activeResponseIndex + (direction === 'previous' ? -1 : 1)];

    if (!target) {
      targetPage = page + (direction === 'previous' ? -1 : 1);
      if (targetPage < 1 || targetPage > data.totalPages) return;
      const adjacentPage = await responsesService.getResponses(
        { formId, ...filters, ...(submittedOrder === 'asc' ? { order: 'asc' as const } : {}), page: targetPage, limit: pageLimit },
        scope
      );
      target = direction === 'previous' ? adjacentPage.data.at(-1) : adjacentPage.data[0];
    }

    if (target) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(targetPage));
      params.set('responseId', target._id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }

  function expandResponse(response: IResponse) {
    const returnTo = `${pathname}?${searchParams.toString()}`;
    // Bug fix, Sprint 12 close-out: `scope` was never passed to the full-page view, which
    // always fell back to its 'personal' default — a workspace response's Stage/prev-next
    // context silently broke (wrong or empty stage list) the moment it was expanded.
    const fullPageParams = new URLSearchParams({
      formId: response.formId,
      scope,
      returnTo,
    });
    router.push(`/inbox/${response._id}?${fullPageParams.toString()}`);
  }

  return { responseId, responses, activeResponsePosition, openResponse, closeResponse, navigateResponse, expandResponse };
}
