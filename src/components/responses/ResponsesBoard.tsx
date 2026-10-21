'use client';

import { useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BoardColumn } from './BoardColumn';
import { canActOnResponses } from '@/lib/roles';
import { columnKeyboardCoordinates, stageIdOfDrop } from '@/lib/boardDnd';
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
}: ResponsesBoardProps) {
  const canAct = canActOnResponses(role);
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a click on the handle is still just a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );
  const [dragging, setDragging] = useState<{ response: IResponse; name: string; reference: string } | null>(null);
  // Cards dropped on another column while the save is in flight. They sit in the new column at once; once the save is done they
  // stay until the lists have refetched (no flash back to the old column), and a failed save removes them again.
  const [moves, setMoves] = useState<Record<string, { response: IResponse; to: string; saved: boolean }>>({});
  const refetching = useIsFetching({ queryKey: responseKeys.all(scope, formId) }) > 0;
  const liveMoves = Object.values(moves).filter((m) => !m.saved || refetching);
  const stageName = (id: string | null | undefined) => stages.find((s) => s.id === id)?.name ?? 'this stage';

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { response: IResponse; name: string; reference: string } | undefined;
    setDragging(data ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const picked = dragging;
    setDragging(null);
    const to = stageIdOfDrop(event.over?.id);
    if (!picked || !to || to === picked.response.stage?.id) return;
    const id = picked.response._id;
    setMoves((m) => ({ ...m, [id]: { response: picked.response, to, saved: false } }));
    void Promise.resolve(onChangeStage(id, to)).then((ok) =>
      setMoves((m) => {
        const { [id]: mine, ...rest } = m;
        return ok === false || !mine ? rest : { ...rest, [id]: { ...mine, saved: true } };
      })
    );
  }

  // Spoken by screen readers during a drag: the person's name and the stage names, never raw ids (QA A4-003 was exactly that bug in the builder).
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${(active.data.current as { name?: string } | undefined)?.name ?? 'a response'}. Use the left and right arrow keys to choose a stage, space to drop, escape to cancel.`,
    onDragOver: ({ active, over }) => {
      const name = (active.data.current as { name?: string } | undefined)?.name ?? 'The response';
      const to = stageIdOfDrop(over?.id);
      return to ? `${name} is over ${stageName(to)}.` : `${name} is not over a stage.`;
    },
    onDragEnd: ({ active, over }) => {
      const name = (active.data.current as { name?: string } | undefined)?.name ?? 'The response';
      const to = stageIdOfDrop(over?.id);
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
    <DndContext sensors={sensors} accessibility={{ announcements }} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
      <div
        // As tall as the room left under the page header, so each column scrolls inside it and the sideways scrollbar sits at the
        // bottom of the screen where it can be seen, not at the end of a very long page.
        className="board-scroll flex h-[calc(100dvh-22rem)] min-h-112 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2 lg:snap-none"
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
            hiddenIds={new Set(liveMoves.filter((m) => m.to !== stage.id).map((m) => m.response._id))}
            incoming={liveMoves.filter((m) => m.to === stage.id).map((m) => ({ ...m.response, stage }))}
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
