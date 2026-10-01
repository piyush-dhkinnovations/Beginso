'use client';

import { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { NoteItem } from './NoteItem';
import { NoteComposer } from './NoteComposer';
import { notesService, MentionAccessError } from '@/services/notes';
import { noteKeys } from '@/lib/queryKeys';
import { useMembers } from '@/hooks/useMembers';
import type { Note } from '@/types/note';

export interface NotesPanelProps {
  responseId: string;
  scope: string;
  workspaceName: string;
  currentUserId: string;
  /** Admin+ may delete any note (design.md §11.3); everyone may edit/delete their own. */
  canDeleteAny: boolean;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §9.2, design.md §6/§7 "NotesPanel — owns the
 * notes query, composer state, edit/delete/undo." Oldest-first (the wireframe's own order — a
 * conversation reads top to bottom, newest at the bottom next to the composer).
 */
export function NotesPanel({ responseId, scope, workspaceName, currentUserId, canDeleteAny }: NotesPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: members = [] } = useMembers(scope === 'personal' ? undefined : scope);
  const listKey = noteKeys.list(scope, responseId);

  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: listKey,
    queryFn: () => notesService.list(responseId, scope),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-scroll to the latest note (bottom, oldest-first order) whenever the list changes —
  // otherwise a new message lands off-screen inside the now-scrollable box instead of in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [notes]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: listKey });
  }

  const createMutation = useMutation({
    mutationFn: (payload: { body: string; mentionIds: string[] }) => notesService.create(responseId, payload, scope),
    onSuccess: invalidate,
    onError: (err) => toast(err instanceof MentionAccessError ? err.message : 'Failed to post note. Please try again.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, body, mentionIds }: { noteId: string; body: string; mentionIds: string[] }) =>
      notesService.update(responseId, noteId, { body, mentionIds }, scope),
    onSuccess: invalidate,
    onError: (err) => toast(err instanceof MentionAccessError ? err.message : 'Failed to save note. Please try again.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => notesService.remove(responseId, noteId, scope),
    onSuccess: invalidate,
    onError: () => toast('Failed to delete note. Please try again.', 'error'),
  });

  function handleDelete(note: Note) {
    // Undo re-creates the note via the Toast action slot (Day 2's built-in action) — same pattern
    // as SaveViewModal's delete-Undo (ResponsesHubView.deleteView), since there is no dedicated
    // restore endpoint for a single note.
    deleteMutation.mutate(note.id, {
      onSuccess: () => {
        toast('Note deleted.', 'success', undefined, {
          label: 'Undo',
          onClick: () =>
            notesService
              .create(responseId, { body: note.body, mentionIds: note.mentions.map((m) => m.id) }, scope)
              .then(invalidate)
              .catch(() => toast('Failed to restore the note.', 'error')),
        });
      },
    });
  }

  return (
    // max-h-125 = 500px (Tailwind's 4px spacing scale, not an arbitrary value) — header and
    // composer stay put; only the message list below scrolls once it outgrows the space between
    // them, same as any chat window.
    <Card className="flex max-h-125 flex-col gap-3">
      <div className="flex items-start gap-2">
        <Lock size={15} className="mt-0.5 shrink-0 text-(--text-muted)" aria-hidden="true" />
        <div>
          <h3 className="bg-body font-semibold text-(--text-primary)">Internal notes</h3>
          {/* No max-w cap — this is a short caption, not long-form prose, and the 65ch cap was
              forcing an unnecessarily narrow wrap on what should read as one flowing sentence
              across the card's actual width. */}
          <p className="mt-0.5 bg-caption text-(--text-muted)">
            Only members of {workspaceName} can see these. The respondent never does, and notes are never
            included in exports or copies.
          </p>
        </div>
      </div>

      <hr className="border-(--border-default)" />

      {/* min-h-0 is required for a flex child to actually shrink and scroll instead of
          stretching the flex container past its own max-h. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" />
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-col items-start gap-2 py-2">
            <p className="bg-body-sm text-(--text-muted)">Couldn&apos;t load notes.</p>
            <button type="button" onClick={() => void refetch()} className="bg-btn bg-btn-secondary bg-btn-sm">
              Retry
            </button>
          </div>
        ) : notes && notes.length > 0 ? (
          // Chat-style list, no divider line between messages — a bubble per message already
          // separates them visually.
          <ul className="flex flex-col">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                members={members}
                isOwn={note.authorId === currentUserId}
                canDeleteAny={canDeleteAny}
                isSaving={updateMutation.isPending && updateMutation.variables?.noteId === note.id}
                onEdit={(body, mentionIds) => updateMutation.mutate({ noteId: note.id, body, mentionIds })}
                onDelete={() => handleDelete(note)}
              />
            ))}
          </ul>
        ) : (
          <div className="py-2 max-w-[42ch]">
            <p className="bg-body-sm font-medium text-(--text-primary)">No internal notes yet</p>
            <p className="mt-0.5 bg-caption text-(--text-muted)">
              Leave context for whoever picks this up next. Use @ to notify a teammate.
            </p>
          </div>
        )}
      </div>

      <NoteComposer
        members={members}
        isSubmitting={createMutation.isPending}
        onSubmit={(body, mentionIds) => createMutation.mutate({ body, mentionIds })}
      />
    </Card>
  );
}
