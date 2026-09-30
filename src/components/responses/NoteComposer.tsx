'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Send, Smile } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/utils';
import { MentionPicker } from './MentionPicker';
import { noteSchema } from '@/lib/schemas/note';
import type { MemberListItem } from '@/types/team';

// A small curated set, not a library — no emoji-picker dependency exists in this project and one
// isn't justified for "drop an emoji into a note," matching how MentionPicker/TagPicker/
// AssigneePicker all build their own lightweight popover rather than reaching for a package.
const QUICK_EMOJI = [
  '👍', '👎', '❤️', '🎉', '😀', '😂', '😮', '😢', '🙏', '👏',
  '🔥', '✅', '❌', '⚠️', '💡', '🚀', '👀', '🤔', '💯', '⭐',
];

// Portaled to document.body with fixed positioning computed from the trigger's real screen
// position — same fix `Menu.tsx` already applies for the identical reason: a trigger sitting
// inside any scrollable/overflow-clipped ancestor (the notes list here) otherwise clips the
// popover at that ancestor's edge instead of letting it float above everything.
function EmojiPicker({
  triggerRef,
  onSelect,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ bottom: number; right: number } | null>(null);

  useEffect(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right });
  }, [triggerRef]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, triggerRef]);

  if (!position) return null;

  return createPortal(
    <div
      ref={ref}
      role="listbox"
      aria-label="Add an emoji"
      style={{ position: 'fixed', bottom: position.bottom, right: position.right }}
      className="bg-menu z-50 grid grid-cols-5 gap-0.5 p-1.5"
    >
      {QUICK_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="option"
          aria-selected={false}
          onClick={() => onSelect(emoji)}
          className="flex h-8 w-8 items-center justify-center rounded text-body-lg hover:bg-(--surface-hover)"
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body
  );
}

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
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [body, setBody] = useState(initialBody);
  const [mentionIds, setMentionIds] = useState<string[]>(initialMentionIds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const mentionedMembers = members.filter((m) => mentionIds.includes(m.userId));

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody((b) => b.slice(0, start) + emoji + b.slice(end));
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

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
    <div className="flex flex-col gap-1.5">
      {/* Single-line pill, both icons anchored inside it — matches the reference composer
          exactly, rather than a boxed textarea with a separate button row underneath. */}
      <div
        className={cn(
          'relative flex items-center gap-1.5 rounded-2xl border bg-(--surface-card) py-2 pl-2 pr-2',
          error ? 'border-error' : 'border-(--border-default) focus-within:border-(--border-focus)'
        )}
      >
        <div className="relative shrink-0">
          <button
            ref={emojiButtonRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={emojiOpen}
            aria-label="Add an emoji"
            onClick={() => setEmojiOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-secondary)"
          >
            <Smile size={16} aria-hidden="true" />
          </button>
          {emojiOpen && <EmojiPicker triggerRef={emojiButtonRef} onSelect={insertEmoji} onClose={() => setEmojiOpen(false)} />}
        </div>

        <textarea
          ref={textareaRef}
          id={textareaId}
          role="combobox"
          aria-expanded={pickerOpen}
          aria-controls={`${textareaId}-mentions`}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-invalid={!!error}
          placeholder="Leave a note. Use @ to notify a teammate."
          value={body}
          autoFocus={autoFocus}
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1.5 text-body-sm text-(--text-primary) outline-none placeholder:text-(--text-muted)"
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !pickerOpen) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <Button
          size="small"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          aria-label={initialBody ? 'Save' : 'Post note'}
          className="h-9 w-9 shrink-0 rounded-full p-0"
        >
          <Send size={15} aria-hidden="true" />
        </Button>

        {pickerOpen && (
          <MentionPicker
            id={`${textareaId}-mentions`}
            members={members}
            query={mentionQuery}
            selectedIds={mentionIds}
            onSelect={selectMention}
            onClose={() => setPickerOpen(false)}
            returnFocusRef={textareaRef}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1 pl-3 text-caption text-error">
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}

      {mentionedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-3">
          {mentionedMembers.map((m) => (
            <Tag key={m.userId} onRemove={() => removeMention(m.userId)} removeLabel={`Remove mention of ${m.name}`}>
              @{m.name}
            </Tag>
          ))}
        </div>
      )}

      {onCancel && (
        <div className="flex justify-end">
          <Button variant="ghost" size="small" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
