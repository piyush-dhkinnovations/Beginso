'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
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
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §9.2, design.md §6. Full ARIA combobox/listbox
 * pattern (the one place this sprint requires it, unlike TagPicker's lighter listbox): arrow keys
 * move `aria-activedescendant`, Enter selects, Escape closes and returns focus to the textarea.
 */
export function MentionPicker({ members, query, selectedIds, onSelect, onClose, returnFocusRef }: MentionPickerProps) {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      id={listboxId}
      role="listbox"
      aria-label="Mention a teammate"
      className="bg-menu absolute bottom-full left-0 z-20 mb-1 max-h-56 w-64 overflow-y-auto"
    >
      {matches.length === 0 ? (
        <p className="px-3 py-2 text-body-sm text-(--text-muted)">No matching members.</p>
      ) : (
        matches.map((member, index) => (
          <button
            key={member.userId}
            id={`${listboxId}-option-${index}`}
            type="button"
            role="option"
            aria-selected={index === clampedActiveIndex}
            className={cn('bg-menu-item flex items-center gap-2', index === clampedActiveIndex && 'bg-(--surface-hover)')}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(member)}
          >
            <Avatar name={member.name} src={member.avatarUrl ?? undefined} size="xs" />
            <span className="min-w-0 flex-1 truncate">{member.name}</span>
          </button>
        ))
      )}
    </div>
  );
}
