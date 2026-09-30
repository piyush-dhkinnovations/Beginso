import { MessageSquare, Paperclip } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Tag } from '@/components/ui/Tag';
import { Tooltip } from '@/components/ui/Tooltip';
import { DuplicateBadge } from './DuplicateBadge';
import { bx } from '@/lib/utils';
import type { ResponseAssignee, ResponseTag } from '@/types/response';

export interface ResponseSignalsData {
  unread?: boolean;
  assignee: ResponseAssignee | null;
  /** Not always present on real data (predates the Tag feature, or an endpoint that doesn't
   * populate it) despite the documented contract saying it always is — defaulted below like
   * `noteCount`/`attachmentCount` already are. Real crash found in manual QA (Calendar view). */
  tags?: ResponseTag[];
  noteCount?: number;
  attachmentCount?: number;
  duplicateOfId?: string | null;
}

export interface ResponseSignalsProps {
  response: ResponseSignalsData;
  /** 'row' (Table), 'card' (Board), 'compact' (Calendar/day list) — design.md §6: "one shared
   * ResponseSignals component so views cannot drift." Required, not defaulted: every caller must
   * make a deliberate choice, per requirements.md §7.4's "every view carries the same signals." */
  density: 'row' | 'card' | 'compact';
  className?: string;
}

const MAX_VISIBLE_TAGS = 2;

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.1) / §7.4 (4.1), design.md §6. The one
 * place unread/assignee/tags/notes/attachments/duplicate render, so Table/Board/Calendar/Chart
 * cannot independently drift (guarded by `__tests__/components/responses/viewSignals.test.tsx`,
 * task 3.5). Pure render — no fetching (design.md §7).
 */
export function ResponseSignals({ response, density, className }: ResponseSignalsProps) {
  const { unread, assignee, tags = [], noteCount = 0, attachmentCount = 0, duplicateOfId } = response;
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const overflowTags = tags.slice(MAX_VISIBLE_TAGS);
  const isCompact = density === 'compact';

  return (
    <div
      className={bx(
        'response-signals flex items-center gap-2 min-w-0',
        density === 'card' && 'flex-wrap',
        className
      )}
      data-density={density}
    >
      {/* Unread — requirements.md §11: "exposed textually ('Unread') ... not colour alone." */}
      <span className="inline-flex items-center gap-1 shrink-0">
        <span
          aria-hidden="true"
          className={bx('h-2 w-2 rounded-full', unread ? 'bg-brand-600' : 'bg-transparent')}
        />
        <span className="sr-only">{unread ? 'Unread' : 'Read'}</span>
      </span>

      {duplicateOfId && <DuplicateBadge />}

      {/* Assignee — requirements.md §7.2: "Unassigned renders a — with accessible name 'Unassigned'."
          `aria-label` names the assignee even at `compact` density, where the visible name is
          hidden and only the avatar's initials show — without it, "who is this assigned to" has
          no accessible representation at all in that density (caught by the viewSignals guard,
          task 3.5). */}
      <span
        className="inline-flex min-w-0 items-center gap-1.5 shrink-0"
        aria-label={
          assignee ? `${assignee.name}${assignee.removed ? ' · no longer has access' : ''}` : 'Unassigned'
        }
      >
        {assignee ? (
          <>
            <Avatar size="xs" name={assignee.name} src={assignee.avatarUrl ?? undefined} alt="" />
            {!isCompact && (
              <span className="response-signals-assignee-name truncate max-w-24 text-caption text-neutral-600">
                {assignee.name}
                {assignee.removed && <span className="text-neutral-400"> · no longer has access</span>}
              </span>
            )}
          </>
        ) : (
          <span aria-hidden="true" className="text-neutral-400">—</span>
        )}
      </span>

      {/* Tags — requirements.md §7.2: "more than 2 tags collapse to '+N' with the rest in a tooltip." */}
      {visibleTags.length > 0 && (
        <span className="inline-flex min-w-0 items-center gap-1 flex-wrap">
          {visibleTags.map((tag) => (
            <Tag key={tag.id} style={{ color: tag.colour }}>
              {tag.name}
            </Tag>
          ))}
          {overflowTags.length > 0 && (
            <Tooltip content={overflowTags.map((t) => t.name).join(', ')}>
              <Tag>+{overflowTags.length}</Tag>
            </Tooltip>
          )}
        </span>
      )}

      {(noteCount > 0 || attachmentCount > 0) && (
        <span className="inline-flex items-center gap-2 shrink-0 text-caption text-neutral-500">
          {noteCount > 0 && (
            <span className="inline-flex items-center gap-0.5" aria-label={`${noteCount} note${noteCount === 1 ? '' : 's'}`}>
              <MessageSquare size={12} aria-hidden="true" />
              {noteCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5"
              aria-label={`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`}
            >
              <Paperclip size={12} aria-hidden="true" />
              {attachmentCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
