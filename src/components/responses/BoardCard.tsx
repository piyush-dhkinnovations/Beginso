'use client';

import { GripVertical, MoreHorizontal } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { ResponseSignals } from './ResponseSignals';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
import { answerFor, cardFields, DEFAULT_BOARD_CARD, type BoardCardConfig } from '@/lib/boardCard';
import { cardDropId } from '@/lib/boardDnd';
import { useFormFields } from '@/hooks/useFormFields';
import { bx } from '@/lib/utils';
import type { IResponse } from '@/types/response';
import type { StageRef } from '@/types/stage';

export interface BoardCardProps {
  response: IResponse;
  /** Every stage in the workspace's pipeline — the "move to" menu offers every stage but the
   * card's own. */
  stages: readonly StageRef[];
  /** The column this card is in (the response's own `stage` is absent in the personal shell). */
  stageId: string;
  canAct: boolean;
  onView: (id: string) => void;
  onChangeStage: (responseId: string, stageId: string) => void;
  /** What the card shows: its headline question. */
  config?: BoardCardConfig;
  /** Other cards may be dropped above or below this one (a single form's board; not the all-forms board). */
  positional?: boolean;
  /** Draws the drop line while a card is being dragged to just above or just below this one. */
  line?: 'above' | 'below';
}

/**
 * One response on the Board: a drag handle at the front, the headline (the respondent, or the question chosen in "Card fields"),
 * the reference, and the shared `ResponseSignals`. The handle is the only draggable part (QA D8-008): the
 * rest of the card stays a plain click target and a touch screen can still scroll the board. The card is also a drop target, so a
 * dragged card can be placed above or below it.
 */
export function BoardCard({ response, stages, stageId, canAct, onView, onChangeStage, config = DEFAULT_BOARD_CARD, positional = false, line }: BoardCardProps) {
  const fields = useFormFields(response.formId);
  const identity = detectRespondentIdentity(response.answers, fields, response.respondentEmail);
  const auto = identity.label ?? identity.email ?? 'Anonymous';
  const live = cardFields(fields);
  const titleField = config.title === 'auto' ? undefined : live.find((f) => f.fieldId === config.title);
  // A response that left the headline question blank falls back to who it is from, so no card is ever nameless.
  const name = (titleField && answerFor(response.answers, fields, titleField)) || auto;
  const reference = response.reference ?? `#${shortId(response._id)}`;

  // The name rides along in the drag data so announcements and the drag preview say who, never a raw id.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: response._id,
    data: { response, name, reference, stageId },
    disabled: !canAct,
  });
  const drop = useDroppable({ id: cardDropId(response._id), data: { stageId }, disabled: !canAct || !positional });

  const moveItems: MenuItem[] = stages
    .filter((s) => s.id !== stageId)
    .map((s) => ({
      id: s.id,
      label: `Move to ${s.name}`,
      onSelect: () => onChangeStage(response._id, s.id),
    }));

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        drop.setNodeRef(el);
      }}
      className={bx('relative', isDragging && 'opacity-40')}
    >
      {line && (
        // Sits in the gap between two cards (absolute, so showing it never moves anything under the pointer).
        <div
          aria-hidden="true"
          className={bx(
            'pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-(--action-primary)',
            "before:absolute before:-left-1 before:-top-0.75 before:h-2 before:w-2 before:rounded-full before:bg-(--action-primary) before:content-['']",
            line === 'above' ? '-top-1.25' : '-bottom-1.25'
          )}
        />
      )}
      <div className="board-card group flex items-start gap-1 rounded-lg border border-(--border-default) bg-(--surface-card) py-2.5 pl-1 pr-2 shadow-sm transition-shadow hover:shadow-md">
        {canAct ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label={`Drag ${name}'s response to another stage`}
            className="flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-(--text-muted) transition-colors hover:bg-(--surface-hover) hover:text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-(--border-focus) active:cursor-grabbing"
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className="w-2 shrink-0" aria-hidden="true" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-1">
            <button
              type="button"
              className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:outline-2 focus-visible:outline-(--border-focus)"
              onClick={() => onView(response._id)}
            >
              {/* The button's name is its visible text (WCAG 2.5.3), led by what it does: "Open response from Ada Lovelace #1169". */}
              <span className="sr-only">Open response from </span>
              <span className="block truncate bg-body-sm font-semibold text-(--text-primary)">{name}</span>
              <span className="block bg-caption tabular-nums text-(--text-muted)">{reference}</span>
            </button>
            {canAct && moveItems.length > 0 && (
              <Menu
                trigger={<MoreHorizontal size={16} aria-hidden="true" />}
                triggerLabel={`Move ${name}'s response to a different stage`}
                triggerClassName="bg-btn bg-btn-ghost bg-btn-sm -mr-1 -mt-0.5 shrink-0"
                items={moveItems}
                align="end"
              />
            )}
          </div>

          <ResponseSignals response={response} density="card" />
        </div>
      </div>
    </div>
  );
}
