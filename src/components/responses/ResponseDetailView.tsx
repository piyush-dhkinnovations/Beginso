'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ResponseDrawer } from '@/components/responses/ResponseDrawer';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { useStages } from '@/hooks/useStages';
import { responseKeys } from '@/lib/queryKeys';
import { parseInboxFiltersFromParams } from '@/lib/inboxFilters';
import type { IResponse } from '@/types/response';

const PAGE_LIMIT = 50;

interface Props {
  id: string;
  /** Workspace slug, or 'personal'. Derived from the URL by the route file — not from ?scope=
   *  — so the layout shell and the data scope are always consistent. */
  scope: string;
}

/**
 * Shared content for the full-page single-response view, used by two routes:
 *   /inbox/[id]            → scope comes from ?scope= (personal inbox or legacy links)
 *   /w/[slug]/inbox/[id]   → scope comes from the URL slug (workspace inbox, WorkspaceShell)
 *
 * Keeping the route files thin (they only resolve `scope`) lets the shell decision live in the
 * URL structure rather than in a query param that the layout cannot see.
 */
export function ResponseDetailView({ id, scope }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId') ?? undefined;
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
    if (returnTo) {
      const nextReturnToParams = new URLSearchParams(returnToParams);
      nextReturnToParams.set('page', String(nextPage));
      const returnToPath = returnTo.slice(0, returnTo.indexOf('?') === -1 ? undefined : returnTo.indexOf('?'));
      params.set('returnTo', `${returnToPath}?${nextReturnToParams.toString()}`);
    }
    // Stay in the same shell: workspace responses go to /w/[slug]/inbox/[id], personal to /inbox/[id].
    const base = scope !== 'personal' ? `/w/${scope}/inbox/${responseId}` : `/inbox/${responseId}`;
    return `${base}?${params.toString()}`;
  }

  async function navigate(direction: 'previous' | 'next') {
    if (activeIndex < 0 || !list) return;
    let targetPage = page;
    let target: IResponse | undefined = responses[activeIndex + (direction === 'previous' ? -1 : 1)];

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

  const fallbackDrawerUrl = scope !== 'personal'
    ? `/w/${scope}/inbox?responseId=${id}`
    : formId
    ? `/forms/${formId}/inbox?responseId=${id}`
    : `/inbox?responseId=${id}`;
  const isSafeDrawerUrl = !!returnTo
    && (
      returnTo.startsWith('/inbox?')
      || /^\/forms\/[^/]+\/(inbox|responses)\?/.test(returnTo)
      || /^\/w\/[^/]+\/(inbox|form-responses)\?/.test(returnTo)
    )
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
