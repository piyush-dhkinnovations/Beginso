'use client';

import { Card } from '@/components/ui/Card';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { ResponseSignals } from './ResponseSignals';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
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
  const identity = detectRespondentIdentity(response.answers);
  const name = identity.label ?? identity.email ?? 'Anonymous';
  const reference = response.reference ?? `#${shortId(response._id)}`;

  const moveItems: MenuItem[] = stages
    .filter((s) => s.id !== response.stage?.id)
    .map((s) => ({
      id: s.id,
      label: `Move to ${s.name}`,
      onSelect: () => onChangeStage(response._id, s.id),
    }));

  return (
    <Card className="board-card @container flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          aria-label={`Open response from ${name}`}
          onClick={() => onView(response._id)}
        >
          <span className="block truncate text-body-sm font-medium text-text-primary">{name}</span>
          <span className="block text-caption text-text-muted">{reference}</span>
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
  );
}
