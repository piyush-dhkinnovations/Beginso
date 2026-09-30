'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { MemberListItem } from '@/types/team';
import type { ResponseAssignee } from '@/types/response';

export interface AssigneePickerProps {
  members: readonly MemberListItem[];
  current: ResponseAssignee | null;
  onChange: (assigneeId: string | null) => void;
  disabled?: boolean;
}

/**
 * Sprint 12 (inbox-collaboration), design.md §6/§15: "Assignee (Unassigned listed first)."
 * Same trigger/listbox keyboard pattern as `StatusDropdown`/`TagPicker` — no new positioning
 * primitive introduced for a single-select list this size.
 */
export function AssigneePicker({ members, current, onChange, disabled }: AssigneePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  function select(userId: string | null) {
    setIsOpen(false);
    triggerRef.current?.focus();
    if (userId !== (current?.id ?? null)) onChange(userId);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 rounded-md border border-(--border-default) bg-(--bg-subtle) px-2.5 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {current ? (
          <>
            <Avatar name={current.name} src={current.avatarUrl ?? undefined} size="xs" />
            <span className="min-w-0 flex-1 truncate text-(--text-primary)">
              {current.name}
              {current.removed && <span className="text-(--text-muted)"> · no longer has access</span>}
            </span>
          </>
        ) : (
          <span className="flex-1 text-(--text-muted)">Unassigned</span>
        )}
        <ChevronDown size={14} className={cn('shrink-0 text-(--text-muted) transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <ul role="listbox" aria-label="Assignee" className="bg-menu absolute left-0 z-20 mt-1 w-full max-h-64 overflow-y-auto">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!current}
              className="bg-menu-item flex items-center gap-2"
              onClick={() => select(null)}
            >
              <span className="flex-1">Unassigned</span>
              {!current && <Check size={14} className="shrink-0" aria-hidden="true" />}
            </button>
          </li>
          {members.map((member) => (
            <li key={member.userId}>
              <button
                type="button"
                role="option"
                aria-selected={current?.id === member.userId}
                className="bg-menu-item flex items-center gap-2"
                onClick={() => select(member.userId)}
              >
                <Avatar name={member.name} src={member.avatarUrl ?? undefined} size="xs" />
                <span className="min-w-0 flex-1 truncate">{member.name}</span>
                {current?.id === member.userId && <Check size={14} className="shrink-0" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
