import { Avatar } from '@/components/ui/Avatar';
import { Tag } from '@/components/ui/Tag';
import { Tooltip } from '@/components/ui/Tooltip';
import { MessageSquare, Paperclip } from 'lucide-react';
import { formatResponseDate, detectRespondentIdentity } from '@/lib/formatters';
import { useFormFields } from '@/hooks/useFormFields';
import type { IResponse, ResponseTag } from '@/types/response';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.1). Cell-building helpers for
 * `ResponsesTable`'s `ui/Table` columns — a bare `<tr>` component no longer fits `ui/Table`'s
 * render-function column API, so this file's job shifted from "one full row" to "the cells that
 * carry response-specific logic," reused by both the Respondent and Tags/Assignee columns.
 */

export function RespondentCell({ response }: { response: IResponse }) {
  const identity = detectRespondentIdentity(response.answers, useFormFields(response.formId), response.respondentEmail);
  const name = identity.label ?? identity.email ?? 'Anonymous';
  const noteCount = response.noteCount ?? 0;
  const attachmentCount = response.attachmentCount ?? 0;
  const hasMeta = noteCount > 0 || attachmentCount > 0;
  // Second line is the email only, never other form answers — and only when it isn't already
  // the name shown above it (a form with no separate name field falls back to email as `name`).
  const secondLine = identity.label ? identity.email : undefined;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: response.unread ? 'var(--action-primary)' : 'transparent' }}
      />
      <span className="sr-only">{response.unread ? 'Unread. ' : ''}</span>
      <Avatar size="sm" name={name} alt="" />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-(--text-primary)">{name}</span>
          {/* Sprint 13: same two signals the Board and Calendar show (ResponseSignals), as text badges. */}
          {response.editedAfterReviewAt && (
            <span className="shrink-0 rounded-full bg-(--warning-surface) px-2 bg-caption font-semibold text-(--warning-text)">Edited</span>
          )}
          {!response.editedAfterReviewAt && response.lastEditedByRespondentAt && (
            <span className="shrink-0 rounded-full bg-(--info-surface) px-2 bg-caption font-semibold text-(--info-text)" title="The respondent changed their answers">Edited</span>
          )}
          {response.isTest && (
            <span className="shrink-0 rounded-full bg-(--bg-sunken) px-2 bg-caption font-semibold text-(--text-secondary)">Test</span>
          )}
          {hasMeta && (
            <span className="flex shrink-0 items-center gap-1.5 bg-caption text-(--text-muted)">
              {noteCount > 0 && (
                <span className="inline-flex items-center gap-1" aria-label={`${noteCount} note${noteCount === 1 ? '' : 's'}`}>
                  <MessageSquare size={14} aria-hidden="true" />
                  {noteCount}
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1" aria-label={`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`}>
                  <Paperclip size={14} aria-hidden="true" />
                  {attachmentCount}
                </span>
              )}
            </span>
          )}
        </span>
        {secondLine && <span className="truncate bg-caption text-(--text-muted)">{secondLine}</span>}
      </div>
    </div>
  );
}

const MAX_VISIBLE_TAGS = 2;

export function TagsCell({ tags }: { tags: ResponseTag[] | undefined }) {
  if (!tags || tags.length === 0) return <span className="text-(--text-muted)">—</span>;
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
    return <span aria-label="Unassigned" className="text-(--text-muted)">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <Avatar size="xs" name={response.assignee.name} src={response.assignee.avatarUrl ?? undefined} alt="" />
      <span className="truncate bg-body-sm text-(--text-secondary)">
        {response.assignee.name}
        {response.assignee.removed && <span className="text-(--text-muted)"> · no longer has access</span>}
      </span>
    </div>
  );
}

export function SubmittedCell({ response }: { response: IResponse }) {
  return <span className="whitespace-nowrap bg-body-sm text-(--text-secondary)">{formatResponseDate(response.submittedAt)}</span>;
}
