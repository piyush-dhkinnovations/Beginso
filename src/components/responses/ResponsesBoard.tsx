'use client';

import { LayoutGrid } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BoardColumn } from './BoardColumn';
import { canActOnResponses } from '@/lib/roles';
import type { ResponseFilters } from '@/types/response';
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
  onChangeStage: (responseId: string, stageId: string) => void;
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
      <EmptyState
        icon={<LayoutGrid />}
        heading="No pipeline stages yet"
        body="Set up this workspace's pipeline stages in Settings to use the board view."
      />
    );
  }

  return (
    <div
      className="board-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:snap-none"
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
        />
      ))}
    </div>
  );
}
