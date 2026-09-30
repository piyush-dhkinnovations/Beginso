'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/utils';
import { NoteComposer } from './NoteComposer';
import { formatRelativeTime } from '@/lib/formatters';
import type { Note } from '@/types/note';
import type { MemberListItem } from '@/types/team';

export interface NoteItemProps {
  note: Note;
  members: readonly MemberListItem[];
  /** Own note = the caller authored it; canDeleteAny = Admin+ (design.md §11.3 "delete others'
   * notes: Owner/Admin"). Edit is always author-only, matching requirements.md §9.2. */
  isOwn: boolean;
  canDeleteAny: boolean;
  onEdit: (body: string, mentionIds: string[]) => void;
  onDelete: () => void;
  isSaving?: boolean;
}

/**
 * Chat-bubble layout (own note right-aligned, others left-aligned). Edit/Delete are not shown at
 * rest; double-clicking a bubble you're allowed to act on reveals them, closing again on an
 * outside click or Escape. The "· edited" marker stays visible to everyone regardless — it's the
 * thing other members are meant to see — never hidden behind the same reveal. Every colour here is
 * a `beginso-ui.css` token (`--action-primary`/`--text-on-brand`/etc.), never a raw value.
 */
export function NoteItem({ note, members, isOwn, canDeleteAny, onEdit, onDelete, isSaving }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const canAct = isOwn || canDeleteAny;

  useEffect(() => {
    if (!showActions) return;
    function handleClick(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) setShowActions(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowActions(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showActions]);

  if (isEditing) {
    return (
      <li className="py-1.5 first:pt-0 last:pb-0">
        <NoteComposer
          members={members}
          initialBody={note.body}
          initialMentionIds={note.mentions.map((m) => m.id)}
          isSubmitting={isSaving}
          autoFocus
          onCancel={() => setIsEditing(false)}
          onSubmit={(body, mentionIds) => {
            onEdit(body, mentionIds);
            setIsEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className={cn('flex items-end gap-2 py-1.5 first:pt-0 last:pb-0', isOwn && 'flex-row-reverse')}>
      <Avatar name={note.authorName} size="sm" className="shrink-0" />
      <div className={cn('flex min-w-0 max-w-[80%] flex-col', isOwn && 'items-end')}>
        {/* Others: name + time above the bubble. Own: no name (it's obviously you) — just the
            time, moved below the bubble instead, matching an ordinary chat layout. */}
        {!isOwn && (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-body-xs font-semibold text-(--text-primary)">
              {note.authorName}
              {note.authorRemoved && <span className="font-normal text-(--text-muted)"> · no longer has access</span>}
            </span>
            <span className="text-body-xs text-(--text-muted)">
              {formatRelativeTime(note.createdAt)}
              {note.editedAt && ' · edited'}
            </span>
          </div>
        )}

        <div
          ref={bubbleRef}
          role={canAct ? 'button' : undefined}
          tabIndex={canAct ? 0 : undefined}
          onDoubleClick={canAct ? () => setShowActions((v) => !v) : undefined}
          onKeyDown={canAct ? (e) => { if (e.key === 'Enter') setShowActions((v) => !v); } : undefined}
          aria-label={canAct ? 'Double-click for edit and delete options' : undefined}
          className={cn(
            'relative mt-0.5 rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap',
            isOwn
              ? 'rounded-br-sm bg-(--action-primary) text-(--text-on-brand)'
              : 'rounded-bl-sm bg-(--bg-subtle) text-(--text-secondary)',
            canAct && 'cursor-pointer'
          )}
        >
          {note.body}

          {note.mentions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {note.mentions.map((m) => (
                <Tag key={m.id} className={isOwn ? 'bg-(--action-primary-active) text-(--text-on-brand)' : undefined}>
                  @{m.name}
                </Tag>
              ))}
            </div>
          )}

          {showActions && (
            <div
              className={cn(
                'bg-menu absolute -top-2 z-10 flex -translate-y-full items-center gap-1 p-1',
                isOwn ? 'right-0' : 'left-0'
              )}
            >
              {isOwn && (
                <button
                  type="button"
                  onClick={() => { setShowActions(false); setIsEditing(true); }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-body-xs text-(--text-secondary) hover:bg-(--surface-hover)"
                >
                  <Pencil size={12} aria-hidden="true" />
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowActions(false); onDelete(); }}
                className="flex items-center gap-1 rounded px-2 py-1 text-body-xs text-error hover:bg-(--error-surface)"
              >
                <Trash2 size={12} aria-hidden="true" />
                Delete
              </button>
            </div>
          )}
        </div>

        {isOwn && (
          <span className="mt-0.5 text-body-xs text-(--text-muted)">
            {formatRelativeTime(note.createdAt)}
            {note.editedAt && ' · edited'}
          </span>
        )}
      </div>
    </li>
  );
}
