import { Avatar } from '@/components/ui/Avatar';
import { Tag } from '@/components/ui/Tag';
import { Tooltip } from '@/components/ui/Tooltip';
import { MessageSquare, Paperclip } from 'lucide-react';
import { formatResponseDate, buildAnswerPreview, detectRespondentIdentity, shortId } from '@/lib/formatters';
import type { IResponse, ResponseTag } from '@/types/response';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.1). Cell-building helpers for
 * `ResponsesTable`'s `ui/Table` columns — a bare `<tr>` component no longer fits `ui/Table`'s
 * render-function column API, so this file's job shifted from "one full row" to "the cells that
 * carry response-specific logic," reused by both the Respondent and Tags/Assignee columns.
 */

export function RespondentCell({ response }: { response: IResponse }) {
  const identity = detectRespondentIdentity(response.answers);
  const name = identity.label ?? identity.email ?? 'Anonymous';
  const reference = response.reference ?? `#${shortId(response._id)}`;
  const noteCount = response.noteCount ?? 0;
  const attachmentCount = response.attachmentCount ?? 0;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: response.unread ? 'var(--color-brand-600)' : 'transparent' }}
      />
      <span className="sr-only">{response.unread ? 'Unread. ' : ''}</span>
      <Avatar size="sm" name={name} alt="" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-text-primary">{name}</span>
        <span className="flex items-center gap-2 text-caption text-text-muted">
          <span>{reference}</span>
          {noteCount > 0 && (
            <span className="inline-flex items-center gap-0.5" aria-label={`${noteCount} note${noteCount === 1 ? '' : 's'}`}>
              <MessageSquare size={11} aria-hidden="true" />
              {noteCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="inline-flex items-center gap-0.5" aria-label={`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`}>
              <Paperclip size={11} aria-hidden="true" />
              {attachmentCount}
            </span>
          )}
        </span>
        <span className="truncate text-caption text-text-muted">{buildAnswerPreview(response.answers)}</span>
      </div>
    </div>
  );
}

const MAX_VISIBLE_TAGS = 2;

export function TagsCell({ tags }: { tags: ResponseTag[] | undefined }) {
  if (!tags || tags.length === 0) return <span className="text-text-muted">—</span>;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = tags.slice(MAX_VISIBLE_TAGS);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => <Tag key={tag.id}>{tag.name}</Tag>)}
      {overflow.length > 0 && (
        <Tooltip content={overflow.map((t) => t.name).join(', ')}>
          <Tag>+{overflow.length}</Tag>
        </Tooltip>
      )}
    </div>
  );
}

export function AssigneeCell({ response }: { response: IResponse }) {
  if (!response.assignee) {
    return <span aria-label="Unassigned" className="text-text-muted">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <Avatar size="xs" name={response.assignee.name} src={response.assignee.avatarUrl ?? undefined} alt="" />
      <span className="truncate text-body-sm text-text-secondary">
        {response.assignee.name}
        {response.assignee.removed && <span className="text-text-muted"> · no longer has access</span>}
      </span>
    </div>
  );
}

export function SubmittedCell({ response }: { response: IResponse }) {
  return <span className="whitespace-nowrap text-body-sm text-text-secondary">{formatResponseDate(response.submittedAt)}</span>;
}
