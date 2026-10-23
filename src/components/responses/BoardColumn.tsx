'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StageBadge } from './StageBadge';
import { BoardCard } from './BoardCard';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { columnDropId, type DropPlace } from '@/lib/boardDnd';
import type { BoardCardConfig } from '@/lib/boardCard';
import type { IResponse, ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';

const COLUMN_PAGE_LIMIT = 20;
const SKELETON_CARDS = 3;

export interface BoardColumnProps {
  scope: string;
  formId?: string;
  /** The active Inbox filters (search/tag/assignee/unread/...) — `stageId` is always overridden
   * to this column's own stage below, so a global stage filter selected on the Table's toolbar
   * has no effect on Board (every column still renders; that's the point of a board). */
  filters: ResponseFilters;
  stage: StageRef;
  stages: readonly StageRef[];
  canAct: boolean;
  onViewResponse: (id: string) => void;
  onChangeStage: (responseId: string, stageId: string) => void;
  /** Cards just dragged AWAY from this column whose move is still being saved: hidden at once instead of waiting for the refetch. */
  hiddenIds?: ReadonlySet<string>;
  /** Cards just dragged INTO this column whose move is still being saved: shown at once, at the place they were dropped (the top when none). */
  incoming?: readonly { response: IResponse; place?: { afterId?: string; beforeId?: string } }[];
  /** What each card shows (the headline question and extra lines). */
  config?: BoardCardConfig;
  /** Cards can be dropped between other cards (a single form's board). */
  positional?: boolean;
  /** While a card is dragged over this column: where it would land, so a line can be drawn there. */
  indicator?: DropPlace | null;
  /** The board reads each column's cards, top to bottom, from here when a card is dropped. */
  idsRef?: MutableRefObject<Record<string, string[]>>;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §20 (task 3.2): "each
 * column paginates independently" — a `useInfiniteQuery` per column (not one combined list query)
 * so a column with more than a page of responses gets a "Load more" instead of silently
 * truncating.
 */
export function BoardColumn({ scope, formId, filters, stage, stages, canAct, onViewResponse, onChangeStage, hiddenIds, incoming = [], config, positional = false, indicator, idsRef }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(stage.id), disabled: !canAct });
  const queryKey = [...responseKeys.list(scope, formId, { ...filters, stageId: stage.id }), 'board'];

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      // sort=board: cards placed by hand in their order, the rest newest first on top.
      responsesService.getResponses({ formId, ...filters, stageId: stage.id, page: pageParam, limit: COLUMN_PAGE_LIMIT, sort: 'board' }, scope),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
  });

  const fetched = data?.pages.flatMap((p) => p.data) ?? [];
  const leaving = fetched.filter((r) => hiddenIds?.has(r._id));
  // Every card being moved is taken out of where it was fetched (in this column or another) and put in at its new place, so a card
  // dropped elsewhere in the same column moves at once too.
  const arriving = incoming;
  const responses = fetched.filter((r) => !hiddenIds?.has(r._id));
  for (const { response, place } of arriving) {
    const after = place?.afterId ? responses.findIndex((r) => r._id === place.afterId) : -1;
    const before = place?.beforeId ? responses.findIndex((r) => r._id === place.beforeId) : -1;
    const at = after !== -1 ? after + 1 : before !== -1 ? before : place?.afterId ? responses.length : 0;
    responses.splice(at, 0, response);
  }
  const total = (data?.pages[0]?.total ?? 0) - leaving.length + arriving.length;
  const ids = responses.map((r) => r._id).join(',');
  useEffect(() => {
    if (idsRef) idsRef.current[stage.id] = ids ? ids.split(',') : [];
  }, [idsRef, stage.id, ids]);

  // The page scrolls, not the column: a column is as long as its cards, and loads its next page when its end comes into view (no
  // "Load more" to find). Where the browser has no IntersectionObserver the button stays as the fallback.
  const endRef = useRef<HTMLDivElement | null>(null);
  const canObserve = typeof IntersectionObserver !== 'undefined';
  useEffect(() => {
    const end = endRef.current;
    if (!canObserve || !end || !hasNextPage || isFetchingNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: '400px' }
    );
    io.observe(end);
    return () => io.disconnect();
    // `responses.length` re-arms the observer after each page: a page too short to push the end out of view must load the next one.
  }, [canObserve, hasNextPage, isFetchingNextPage, fetchNextPage, responses.length]);

  return (
    <div
      className="board-column flex w-72 shrink-0 snap-start flex-col rounded-xl border border-(--border-subtle) bg-(--bg-subtle) p-2"
      role="listitem"
      aria-label={`${stage.name} column`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-2">
        <StageBadge stage={stage} />
        <span
          className="min-w-6 rounded-full bg-(--surface-card) px-2 py-0.5 text-center bg-caption font-medium tabular-nums text-(--text-secondary)"
          aria-label={`${total} response${total === 1 ? '' : 's'}`}
        >
          {total}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-0.5 transition-shadow${isOver ? ' ring-2 ring-(--action-primary)' : ''}`}
        aria-busy={isLoading || undefined}
      >
        {isLoading &&
          Array.from({ length: SKELETON_CARDS }).map((_, i) => (
            <Skeleton key={i} variant="block" height={92} className="rounded-lg" />
          ))}

        {isError && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-(--border-default) p-3 text-center">
            <AlertCircle size={16} className="text-(--text-muted)" aria-hidden="true" />
            <p className="bg-body-sm text-(--text-muted)">Couldn&apos;t load this column.</p>
            <Button variant="secondary" size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && responses.length === 0 && (
          <p className="rounded-lg border border-dashed border-(--border-default) px-3 py-6 text-center bg-body-sm text-(--text-muted)">
            No responses in {stage.name}
          </p>
        )}

        {responses.map((r) => (
          <BoardCard
            key={r._id}
            response={r}
            stages={stages}
            stageId={stage.id}
            canAct={canAct}
            onView={onViewResponse}
            onChangeStage={onChangeStage}
            config={config}
            positional={positional}
            line={indicator?.beforeId === r._id ? 'above' : indicator?.afterId === r._id && !indicator.beforeId ? 'below' : undefined}
          />
        ))}

        {hasNextPage && (canObserve ? (
          <div ref={endRef} className="flex min-h-8 shrink-0 items-center justify-center bg-caption text-(--text-muted)" role="status">
            {isFetchingNextPage ? 'Loading more…' : ''}
          </div>
        ) : (
          <Button variant="ghost" size="small" isLoading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            Load more
          </Button>
        ))}
      </div>
    </div>
  );
}
