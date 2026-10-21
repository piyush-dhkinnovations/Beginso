'use client';

import { GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/Card';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { ResponseSignals } from './ResponseSignals';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
import { useFormFields } from '@/hooks/useFormFields';
import type { IResponse } from '@/types/response';
import type { StageRef } from '@/types/stage';

export interface BoardCardProps {
  response: IResponse;
  /** Every stage in the workspace's pipeline — the "move to" menu offers every stage but the
   * card's own. */
  stages: readonly StageRef[];
  canAct: boolean;
  onView: (id: string) => void;
  onChangeStage: (responseId: string, stageId: string) => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§15 (task 3.2). Card
 * body is `ResponseSignals density="card"` (design's own "one shared component" rule) plus the
 * respondent identity — signals don't carry a name, so it's rendered here rather than duplicating
 * unread/assignee/tag logic that ResponseSignals already owns. Stage move is a `ui/Menu` — no
 * drag (OQ-12 resolved: not required).
 */
export function BoardCard({ response, stages, canAct, onView, onChangeStage }: BoardCardProps) {
  const identity = detectRespondentIdentity(response.answers, useFormFields(response.formId), response.respondentEmail);
  const name = identity.label ?? identity.email ?? 'Anonymous';
  const reference = response.reference ?? `#${shortId(response._id)}`;
  // Drag by the handle only (QA D8-008): the rest of the card stays a plain click target and a touch screen can still scroll the board.
  // The name rides along in the drag data so announcements and the drag preview say who, never a raw id.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: response._id,
    data: { response, name, reference },
    disabled: !canAct,
  });

  const moveItems: MenuItem[] = stages
    .filter((s) => s.id !== response.stage?.id)
    .map((s) => ({
      id: s.id,
      label: `Move to ${s.name}`,
      onSelect: () => onChangeStage(response._id, s.id),
    }));

  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-40' : undefined}>
    <Card className="board-card @container flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        {canAct && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label={`Drag ${name}'s response to another stage`}
            className="-ml-1 flex min-h-8 min-w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) active:cursor-grabbing"
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="min-w-0 text-left"
          aria-label={`Open response from ${name}`}
          onClick={() => onView(response._id)}
        >
          <span className="block truncate bg-body-sm font-medium text-(--text-primary)">{name}</span>
          <span className="block bg-caption text-(--text-muted)">{reference}</span>
        </button>

        {canAct && moveItems.length > 0 && (
          <Menu
            trigger="⋯"
            triggerLabel={`Move ${name}'s response to a different stage`}
            items={moveItems}
            align="end"
          />
        )}
      </div>

      <ResponseSignals response={response} density="card" />
    </Card>
    </div>
  );
}
