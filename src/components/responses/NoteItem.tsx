'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
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

export function NoteItem({ note, members, isOwn, canDeleteAny, onEdit, onDelete, isSaving }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="py-3 first:pt-0 last:pb-0">
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
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar name={note.authorName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body-sm font-semibold text-(--text-primary)">
            {note.authorName}
            {note.authorRemoved && <span className="font-normal text-(--text-muted)"> · no longer has access</span>}
          </span>
          <span className="text-caption text-(--text-muted)">
            {formatRelativeTime(note.createdAt)}
            {note.editedAt && ' · edited'}
          </span>
        </div>
        <p className="mt-1 max-w-[65ch] whitespace-pre-wrap text-body-sm text-(--text-secondary)">{note.body}</p>
        {note.mentions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {note.mentions.map((m) => (
              <Tag key={m.id}>@{m.name}</Tag>
            ))}
          </div>
        )}
        {(isOwn || canDeleteAny) && (
          <div className="mt-1.5 flex items-center gap-1">
            {isOwn && (
              <Button variant="ghost" size="small" onClick={() => setIsEditing(true)} className="gap-1 px-2 text-(--text-muted)">
                <Pencil size={12} aria-hidden="true" />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="small" onClick={onDelete} className="gap-1 px-2 text-error">
              <Trash2 size={12} aria-hidden="true" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
