'use client';

import { useId, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Tag } from '@/components/ui/Tag';
import { MentionPicker } from './MentionPicker';
import { noteSchema } from '@/lib/schemas/note';
import type { MemberListItem } from '@/types/team';

export interface NoteComposerProps {
  members: readonly MemberListItem[];
  onSubmit: (body: string, mentionIds: string[]) => void;
  isSubmitting?: boolean;
  /** Present when editing an existing note in place, rather than composing a new one. */
  initialBody?: string;
  initialMentionIds?: string[];
  onCancel?: () => void;
  autoFocus?: boolean;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §9.2, design.md §6/§7. `@` opens
 * `MentionPicker`; a selection appends a chip and inserts the name into the body text (display
 * only — `mentionIds` is tracked separately and is what's actually sent, never parsed back out of
 * the text per design.md §11.2/§17's explicit rule).
 */
export function NoteComposer({
  members,
  onSubmit,
  isSubmitting,
  initialBody = '',
  initialMentionIds = [],
  onCancel,
  autoFocus,
}: NoteComposerProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initialBody);
  const [mentionIds, setMentionIds] = useState<string[]>(initialMentionIds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [error, setError] = useState<string | undefined>();

  const mentionedMembers = members.filter((m) => mentionIds.includes(m.userId));

  function handleChange(value: string) {
    setBody(value);
    const trigger = value.match(/@([^\s@]*)$/);
    if (trigger) {
      setMentionQuery(trigger[1]);
      setPickerOpen(true);
    } else {
      setPickerOpen(false);
    }
  }

  function selectMention(member: MemberListItem) {
    // Replace the trailing "@query" the user was typing with nothing — the mention becomes a chip
    // below the textarea, not inline text (design.md §11.2: mentionIds come from the picker, never
    // parsed from the body).
    setBody((b) => b.replace(/@([^\s@]*)$/, ''));
    setMentionIds((ids) => (ids.includes(member.userId) ? ids : [...ids, member.userId]));
    setPickerOpen(false);
    textareaRef.current?.focus();
  }

  function removeMention(userId: string) {
    setMentionIds((ids) => ids.filter((id) => id !== userId));
  }

  function handleSubmit() {
    const result = noteSchema.safeParse({ body, mentionIds });
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    onSubmit(result.data.body, result.data.mentionIds ?? []);
    setBody('');
    setMentionIds([]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          id={textareaId}
          role="combobox"
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder="Leave a note. Use @ to notify a teammate."
          value={body}
          error={error}
          autoFocus={autoFocus}
          rows={3}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !pickerOpen) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        {pickerOpen && (
          <MentionPicker
            members={members}
            query={mentionQuery}
            selectedIds={mentionIds}
            onSelect={selectMention}
            onClose={() => setPickerOpen(false)}
            returnFocusRef={textareaRef}
          />
        )}
      </div>

      {mentionedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentionedMembers.map((m) => (
            <Tag key={m.userId} onRemove={() => removeMention(m.userId)} removeLabel={`Remove mention of ${m.name}`}>
              @{m.name}
            </Tag>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="small" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button size="small" onClick={handleSubmit} isLoading={isSubmitting} className="gap-1.5">
          <Send size={14} aria-hidden="true" />
          {initialBody ? 'Save' : 'Post note'}
        </Button>
      </div>
    </div>
  );
}
