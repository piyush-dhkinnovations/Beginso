'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Tag as TagChip } from '@/components/ui/Tag';
import { Input } from '@/components/ui/Input';
import type { Tag } from '@/types/tag';

export interface TagPickerProps {
  /** The full workspace tag library (for search/select). */
  available: readonly Tag[];
  /** Ids of tags currently on the response. */
  selectedIds: readonly string[];
  /** Whether the caller may create a new tag inline (OQ-5 default: any `responses:act` role). */
  canCreate: boolean;
  disabled?: boolean;
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreate: (name: string) => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.7 (7.1), design.md §6. Tag picker for the
 * detail sidebar/bulk bar: search the workspace library, create inline when permitted (OQ-5).
 * A lighter custom listbox rather than a full ARIA combobox (`MentionPicker`, task 4.2, is where
 * that full pattern is required by requirements.md §9.2) — every control here is still a real,
 * keyboard-operable `<button>`, Escape closes and returns focus to the trigger.
 */
export function TagPicker({ available, selectedIds, canCreate, disabled, onAdd, onRemove, onCreate }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const selected = available.filter((t) => selectedIds.includes(t.id));
  const matches = available.filter(
    (t) => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const exactMatch = available.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());
  const canOfferCreate = canCreate && query.trim().length > 0 && !exactMatch;

  function close() {
    setIsOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  return (
    // Bordered box like Stage/Assignee's own controls (min-h-11 to match) — was a bare ghost
    // button with no border before, standing out from the rest of the sidebar.
    <div
      ref={containerRef}
      className="relative flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-md border border-(--border-default) bg-(--bg-subtle) px-2.5 py-1.5"
    >
      {selected.map((tag) => (
        <TagChip key={tag.id} onRemove={disabled ? undefined : () => onRemove(tag.id)} removeLabel={`Remove tag ${tag.name}`}>
          {tag.name}
        </TagChip>
      ))}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        // A plain ghost button read as empty space next to a tag pill — its own dashed-border
        // pill makes it unmistakably a second, clickable chip rather than blank space.
        className="flex items-center gap-1 rounded-full border border-dashed border-(--border-default) px-2.5 py-1 bg-caption text-(--text-secondary) hover:border-(--text-muted) hover:text-(--text-primary) disabled:opacity-60"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Plus size={12} aria-hidden="true" />
        Add tag
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Add a tag"
          className="bg-menu z-50 absolute top-full left-0 mt-1 min-w-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
        >
          <div className="p-2">
            <Input
              id="tag-picker-search"
              aria-label="Search tags"
              placeholder="Search or create…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          {matches.map((tag) => (
            <button
              key={tag.id}
              type="button"
              role="option"
              aria-selected={false}
              className="bg-menu-item"
              onClick={() => {
                onAdd(tag.id);
                setQuery('');
              }}
            >
              {tag.name}
            </button>
          ))}
          {canOfferCreate && (
            <button
              type="button"
              className="bg-menu-item"
              onClick={() => {
                onCreate(query.trim());
                setQuery('');
              }}
            >
              Create &quot;{query.trim()}&quot;
            </button>
          )}
          {matches.length === 0 && !canOfferCreate && (
            <p className="px-3 py-2 bg-body-sm text-(--text-muted)">No matching tags.</p>
          )}
        </div>
      )}
    </div>
  );
}
