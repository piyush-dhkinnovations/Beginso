'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ResponseDrawer } from '@/components/responses/ResponseDrawer';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { useStages } from '@/hooks/useStages';
import { responseKeys } from '@/lib/queryKeys';
import { parseInboxFiltersFromParams } from '@/lib/inboxFilters';

const PAGE_LIMIT = 50; // matches ResponsesHubView's own default page size.

/**
 * Full-page response view opened from the expand action in ResponseDrawer.
 *
 * Bug fix, Sprint 12 close-out: this previously only ever rendered the drawer's own content —
 * `scope` and `stages` were never supplied (always the 'personal' default, and an always-empty
 * stage list), and prev/next were never wired at all (no hasPrevious/hasNext/onPrevious/onNext),
 * so the full-page view silently lost the surrounding Inbox context the drawer has. `returnTo`
 * already carries the list's filters/page as a query string (set by ResponsesHubView's onExpand)
 * — reused here via the same `parseInboxFiltersFromParams` helper to refetch the identical
 * filtered page and support prev/next exactly like `ResponsesHubView.navigateResponse` does.
 */
export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId') ?? undefined;
  const scope = searchParams.get('scope') ?? 'personal';
  const returnTo = searchParams.get('returnTo');

  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  const { data: stages = [] } = useStages(scope === 'personal' ? undefined : scope);

  const returnToParams = returnTo?.includes('?')
    ? new URLSearchParams(returnTo.slice(returnTo.indexOf('?') + 1))
    : new URLSearchParams();
  const { filters } = parseInboxFiltersFromParams(returnToParams, stages);
  const page = Number(returnToParams.get('page') ?? '1') || 1;

  const { data: list } = useQuery({
    queryKey: [...responseKeys.all(scope, formId), 'expand-nav', filters, page],
    queryFn: () => responsesService.getResponses({ formId, ...filters, page, limit: PAGE_LIMIT }, scope),
    enabled: !!returnTo,
  });

  const responses = list?.data ?? [];
  const activeIndex = responses.findIndex((r) => r._id === id);
  const position = activeIndex >= 0 ? (page - 1) * PAGE_LIMIT + activeIndex + 1 : undefined;

  function buildUrl(responseId: string, nextPage: number) {
    const params = new URLSearchParams();
    if (formId) params.set('formId', formId);
    params.set('scope', scope);
    if (returnTo) {
      const nextReturnToParams = new URLSearchParams(returnToParams);
      nextReturnToParams.set('page', String(nextPage));
      const returnToPath = returnTo.slice(0, returnTo.indexOf('?') === -1 ? undefined : returnTo.indexOf('?'));
      params.set('returnTo', `${returnToPath}?${nextReturnToParams.toString()}`);
    }
    return `/responses/${responseId}?${params.toString()}`;
  }

  async function navigate(direction: 'previous' | 'next') {
    if (activeIndex < 0 || !list) return;
    let targetPage = page;
    let target: (typeof responses)[number] | undefined = responses[activeIndex + (direction === 'previous' ? -1 : 1)];

    if (!target) {
      targetPage = page + (direction === 'previous' ? -1 : 1);
      if (targetPage < 1 || targetPage > list.totalPages) return;
      const adjacent = await responsesService.getResponses({ formId, ...filters, page: targetPage, limit: PAGE_LIMIT }, scope);
      target = direction === 'previous' ? adjacent.data.at(-1) : adjacent.data[0];
    }

    if (target) router.push(buildUrl(target._id, targetPage));
  }

  const fileFieldLabels = (form?.fields ?? [])
    .filter((field) => field.type === 'file_upload' && !field.deleted)
    .sort((a, b) => a.order - b.order)
    .map((field) => field.label);

  const fallbackDrawerUrl = formId
    ? `/forms/${formId}/responses?responseId=${id}`
    : `/responses?responseId=${id}`;
  const isSafeDrawerUrl = !!returnTo
    && (returnTo.startsWith('/responses?') || /^\/forms\/[^/]+\/responses\?/.test(returnTo))
    && returnToParams.get('responseId') === id;
  const drawerUrl = isSafeDrawerUrl ? returnTo : fallbackDrawerUrl;

  return (
    <ResponseDrawer
      responseId={id}
      formId={formId}
      scope={scope}
      stages={stages}
      formTitle={form?.title}
      fileFieldLabels={fileFieldLabels}
      displayMode="page"
      position={position}
      totalResponses={list?.total}
      hasPrevious={position !== undefined && position > 1}
      hasNext={position !== undefined && position < (list?.total ?? 0)}
      onPrevious={() => void navigate('previous')}
      onNext={() => void navigate('next')}
      onOpenResponse={(responseId) => router.push(buildUrl(responseId, page))}
      collapseHref={drawerUrl}
      onClose={() => router.replace(drawerUrl)}
    />
  );
}
