'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/ui/Avatar';
import type { MemberListItem } from '@/types/team';

export interface MentionPickerProps {
  /** Workspace members — filtering to "who can access this form" has no dedicated endpoint yet
   * (design.md §11.3's own list of gaps); the server is the real gate (422 on a mention without
   * form access, design.md §11.2) so this list is a convenience, not the boundary. */
  members: readonly MemberListItem[];
  query: string;
  selectedIds: readonly string[];
  onSelect: (member: MemberListItem) => void;
  onClose: () => void;
  /** Returns focus to the composer's textarea on Escape (requirements.md §9.2). */
  returnFocusRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Lets the owning `<textarea role="combobox">` point `aria-controls` at this listbox — falls
   * back to an internally generated id when the caller doesn't need to reference it. */
  id?: string;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §9.2, design.md §6. Full ARIA combobox/listbox
 * pattern (the one place this sprint requires it, unlike TagPicker's lighter listbox): arrow keys
 * move `aria-activedescendant`, Enter selects, Escape closes and returns focus to the textarea.
 */
export function MentionPicker({ members, query, selectedIds, onSelect, onClose, returnFocusRef, id }: MentionPickerProps) {
  const generatedId = useId();
  const listboxId = id ?? generatedId;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ bottom: number; left: number; width: number } | null>(null);

  // Portaled to document.body, fixed-positioned from the textarea's real screen position — same
  // fix as `Menu.tsx`/the note composer's emoji picker: anchored `absolute` inside the notes
  // list's scrollable ancestor otherwise clips this popover at that ancestor's edge.
  useEffect(() => {
    const rect = returnFocusRef.current?.getBoundingClientRect();
    if (rect) setPosition({ bottom: window.innerHeight - rect.top + 6, left: rect.left, width: Math.max(rect.width, 256) });
  }, [returnFocusRef]);

  const matches = members.filter(
    (m) => !selectedIds.includes(m.userId) && m.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  // Reset the active option whenever the query changes the match set, without a setState-in-effect
  // (clamping on render is enough here — matches is a pure derivation of props/query).
  const clampedActiveIndex = Math.min(activeIndex, Math.max(matches.length - 1, 0));

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (matches[clampedActiveIndex]) {
          e.preventDefault();
          onSelect(matches[clampedActiveIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        returnFocusRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [matches, clampedActiveIndex, onSelect, onClose, returnFocusRef]);

  if (!position) return null;

  return createPortal(
    <div
      ref={containerRef}
      id={listboxId}
      role="listbox"
      aria-label="Mention a teammate"
      style={{ position: 'fixed', bottom: position.bottom, left: position.left, width: position.width }}
      className="bg-menu z-50 max-h-56 overflow-y-auto"
    >
      {matches.length === 0 ? (
        <p className="px-3 py-2 bg-body-sm text-(--text-muted)">No matching members.</p>
      ) : (
        matches.map((member, index) => (
          <button
            key={member.userId}
            id={`${listboxId}-option-${index}`}
            type="button"
            role="option"
            aria-selected={index === clampedActiveIndex}
            // Plain `.bg-menu-item` — its own `:hover` already gives hover feedback; no extra
            // mouse-driven background class on top of it (name-only, compact, nothing more).
            className="bg-menu-item flex items-center gap-2"
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(member)}
          >
            {/* Initials only, never `avatarUrl` — a wrong/unrelated image (real bug found here:
                two members both named "test" rendered with random-looking logo images instead of
                a person's actual photo) is worse than a deterministic colour+initials circle. */}
            <Avatar name={member.name} size="xs" className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{member.name}</span>
          </button>
        ))
      )}
    </div>,
    document.body
  );
}
