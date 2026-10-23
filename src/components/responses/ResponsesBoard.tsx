'use client';

import { useRef, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors, type Announcements, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core';
import { LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { BoardColumn } from './BoardColumn';
import { canActOnResponses } from '@/lib/roles';
import { columnKeyboardCoordinates, isCardDrop, isSamePlace, placeNear, stageIdOfDrop, type DropPlace } from '@/lib/boardDnd';
import { responsesService } from '@/services/responses';
import type { BoardCardConfig } from '@/lib/boardCard';
import { responseKeys } from '@/lib/queryKeys';
import type { IResponse, ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';
import type { Role } from '@/types/workspace';

const SKELETON_COLUMNS = 3;
const SKELETON_CARDS = 3;

export interface ResponsesBoardProps {
  scope: string;
  formId?: string;
  filters: ResponseFilters;
  stages: readonly StageRef[];
  stagesLoading: boolean;
  role: Role | undefined;
  onViewResponse: (id: string) => void;
  /** May return a promise that resolves to false when the save failed: a dragged card then goes back to its column. */
  onChangeStage: (responseId: string, stageId: string) => void | Promise<boolean>;
  /** What each card shows (chosen per form in "Card fields"). */
  cardConfig?: BoardCardConfig;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§15/§16 (task 3.2).
 * Columns = the workspace's pipeline stages in order, each a `BoardColumn` owning its own
 * pagination. Horizontal scroll with snap below desktop (design.md §16); `lg:snap-none` matches
 * the design's own 1024px breakpoint rather than Tailwind's default `md`.
 */
export function ResponsesBoard({
  scope,
  formId,
  filters,
  stages,
  stagesLoading,
  role,
  onViewResponse,
  onChangeStage,
  cardConfig,
}: ResponsesBoardProps) {
  const canAct = canActOnResponses(role);
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a click on the handle is still just a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );
  type Picked = { response: IResponse; name: string; reference: string; stageId: string };
  const [dragging, setDragging] = useState<Picked | null>(null);
  // Cards dropped somewhere while the save is in flight (another column, or another place in the same one). They sit at their new
  // place at once; once the save is done they stay until the lists have refetched (no flash back to the old place), and a failed
  // save removes them again.
  const [moves, setMoves] = useState<Record<string, { response: IResponse; to: string; place?: { afterId?: string; beforeId?: string }; saved: boolean }>>({});
  const refetching = useIsFetching({ queryKey: responseKeys.all(scope, formId) }) > 0;
  const liveMoves = Object.values(moves).filter((m) => !m.saved || refetching);
  const stageName = (id: string | null | undefined) => stages.find((s) => s.id === id)?.name ?? 'this stage';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Cards can be dropped between other cards on a single form's board; the all-forms board mixes forms, so a card there only picks a column.
  const positional = !!formId && canAct;
  // Each column's cards, top to bottom (the columns keep this up to date), and where the pointer is while dragging.
  const idsRef = useRef<Record<string, string[]>>({});
  const pointerY = useRef(0);
  // False for a keyboard drag, which has no pointer: it only picks a column (the card lands on top, like "Move to" in the menu).
  const pointerDrag = useRef(false);
  const [indicator, setIndicator] = useState<DropPlace | null>(null);

  // While dragging with a pointer: the column the pointer is in, and in it the card nearest the pointer (the drop place is worked out
  // from that card and which half of it the pointer is in). A keyboard drag has no pointer and just picks a column.
  const collisionDetection: CollisionDetection = (args) => {
    const columns = pointerWithin({ ...args, droppableContainers: args.droppableContainers.filter((c) => !isCardDrop(c.id)) });
    if (!args.pointerCoordinates) return rectIntersection({ ...args, droppableContainers: args.droppableContainers.filter((c) => !isCardDrop(c.id)) });
    pointerY.current = args.pointerCoordinates.y;
    pointerDrag.current = true;
    const column = columns[0];
    if (!column || !positional) return columns;
    const stageId = stageIdOfDrop(column.id);
    let nearest: { id: string | number; distance: number } | null = null;
    for (const c of args.droppableContainers) {
      if (!isCardDrop(c.id) || c.data.current?.stageId !== stageId) continue;
      const rect = args.droppableRects.get(c.id);
      if (!rect) continue;
      const distance = Math.abs(args.pointerCoordinates.y - (rect.top + rect.height / 2));
      if (!nearest || distance < nearest.distance) nearest = { id: c.id, distance };
    }
    return nearest ? [{ id: nearest.id }] : columns;
  };

  const placeFor = (over: DragMoveEvent['over'], draggedId: string): DropPlace | null => {
    if (!over) return null;
    const stageId = isCardDrop(over.id) ? (over.data.current?.stageId as string | undefined) : stageIdOfDrop(over.id);
    if (!stageId) return null;
    const ids = idsRef.current[stageId] ?? [];
    if (!positional || !pointerDrag.current) return { stageId };
    const overId = isCardDrop(over.id) ? over.id.slice('card:'.length) : null;
    return placeNear(stageId, ids, draggedId, overId, pointerY.current < over.rect.top + over.rect.height / 2);
  };

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as Picked | undefined;
    pointerDrag.current = false;
    setDragging(data ?? null);
  }

  function handleDragMove(event: DragMoveEvent) {
    const picked = dragging;
    if (!picked) return;
    const next = placeFor(event.over, picked.response._id);
    setIndicator((prev) => (prev?.stageId === next?.stageId && prev?.afterId === next?.afterId && prev?.beforeId === next?.beforeId ? prev : next));
  }

  function handleDragEnd(event: DragEndEvent) {
    const picked = dragging;
    setDragging(null);
    setIndicator(null);
    if (!picked) return;
    const id = picked.response._id;
    const place = placeFor(event.over, id);
    if (!place) return;
    const from = picked.stageId;
    const sameColumn = place.stageId === from;
    const placed = positional && (place.afterId || place.beforeId) ? { afterId: place.afterId, beforeId: place.beforeId } : undefined;
    if (sameColumn && (!positional || isSamePlace(place, from, idsRef.current[from] ?? [], id))) return;
    setMoves((m) => ({ ...m, [id]: { response: { ...picked.response, stage: stages.find((s) => s.id === place.stageId) ?? picked.response.stage }, to: place.stageId, place: placed, saved: false } }));
    void (async () => {
      let ok = true;
      if (!sameColumn) ok = (await Promise.resolve(onChangeStage(id, place.stageId))) !== false;
      if (ok && placed) {
        try {
          await responsesService.placeOnBoard(id, placed, scope);
          await queryClient.invalidateQueries({ queryKey: responseKeys.all(scope, formId) });
        } catch {
          toast('Could not save where the card was dropped. Please try again.', 'error');
          ok = false;
        }
      }
      setMoves((m) => {
        const { [id]: mine, ...rest } = m;
        return !ok || !mine ? rest : { ...rest, [id]: { ...mine, saved: true } };
      });
    })();
  }

  const overStage = (over: DragMoveEvent['over']) => (!over ? null : isCardDrop(over.id) ? ((over.data.current?.stageId as string | undefined) ?? null) : stageIdOfDrop(over.id));

  // Spoken by screen readers during a drag: the person's name and the stage names, never raw ids (QA A4-003 was exactly that bug in the builder).
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${(active.data.current as { name?: string } | undefined)?.name ?? 'a response'}. Use the left and right arrow keys to choose a stage, space to drop, escape to cancel.`,
    onDragOver: ({ active, over }) => {
      const name = (active.data.current as { name?: string } | undefined)?.name ?? 'The response';
      const to = overStage(over);
      return to ? `${name} is over ${stageName(to)}.` : `${name} is not over a stage.`;
    },
    onDragEnd: ({ active, over }) => {
      const name = (active.data.current as { name?: string } | undefined)?.name ?? 'The response';
      const to = overStage(over);
      return to ? `${name} was dropped on ${stageName(to)}.` : `${name} was dropped. It stays in its stage.`;
    },
    onDragCancel: ({ active }) => `Moving ${(active.data.current as { name?: string } | undefined)?.name ?? 'the response'} was cancelled.`,
  };

  if (stagesLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2" aria-busy="true">
        {Array.from({ length: SKELETON_COLUMNS }).map((_, col) => (
          <div key={col} className="flex w-72 shrink-0 flex-col gap-2">
            <Skeleton variant="title" width={96} />
            {Array.from({ length: SKELETON_CARDS }).map((_, row) => (
              <Skeleton key={row} variant="block" height={92} className="rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <EmptyState illustration="pipeline"
        icon={<LayoutGrid />}
        title="No pipeline stages yet"
        description="Set up this workspace's pipeline stages in Settings to use the board view."
      />
    );
  }

  return (
    <DndContext sensors={sensors} accessibility={{ announcements }} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} onDragCancel={() => { setDragging(null); setIndicator(null); }}>
      <div
        // `relative` + `min-w-0`: the cards' screen-reader-only text is absolutely positioned and must be clipped with the board, or lanes
        // far to the right push the whole page sideways (header and sidebar then slide out of place).
        className="board-scroll relative flex min-w-0 max-w-full snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2 lg:snap-none"
        role="list"
        aria-label="Responses board"
      >
        {stages.map((stage) => (
          <BoardColumn
            key={stage.id}
            scope={scope}
            formId={formId}
            filters={filters}
            stage={stage}
            stages={stages}
            canAct={canAct}
            onViewResponse={onViewResponse}
            onChangeStage={onChangeStage}
            hiddenIds={new Set(liveMoves.map((m) => m.response._id))}
            incoming={liveMoves.filter((m) => m.to === stage.id).map((m) => ({ response: { ...m.response, stage }, place: m.place }))}
            config={cardConfig}
            positional={positional}
            indicator={indicator?.stageId === stage.id ? indicator : null}
            idsRef={idsRef}
          />
        ))}
      </div>
      <DragOverlay>
        {dragging && (
          <Card className="board-card w-72 cursor-grabbing shadow-lg">
            <span className="block truncate bg-body-sm font-medium text-(--text-primary)">{dragging.name}</span>
            <span className="block bg-caption text-(--text-muted)">{dragging.reference}</span>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
