'use client';

import { useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { FormPage } from '@/types/form';

export interface PageSwitcherProps {
  pages: FormPage[];
  activePageId: string | null;
  fieldCounts: Record<string, number>;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
}

const fieldsText = (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`;

// The row of page buttons above the canvas. One page is always active; its questions are the only ones shown. A button
// reads the page's name, or "Page N" while it has none. From 1024px the active one carries an X that deletes the page
// (Undo brings it back); below that, renaming and deleting stay desktop-only, said so rather than silently missing.
export function PageSwitcher({ pages, activePageId, fieldCounts, onSelectPage, onAddPage, onDeletePage }: PageSwitcherProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  // A new page, or one picked by undo, may sit outside the visible part of the row. Only the row scrolls, never the page.
  useEffect(() => {
    const row = rowRef.current;
    const active = row?.querySelector<HTMLElement>('[data-active="true"]');
    if (!row || !active) return;
    const end = active.offsetLeft + active.offsetWidth;
    if (active.offsetLeft < row.scrollLeft) row.scrollLeft = active.offsetLeft;
    else if (end > row.scrollLeft + row.clientWidth) row.scrollLeft = end - row.clientWidth;
  }, [activePageId, pages.length]);

  return (
    <div className="mx-auto flex w-full max-w-190 shrink-0 flex-col gap-1 py-2 max-lg:border-b max-lg:border-(--border-default) max-lg:bg-(--surface-card) max-lg:px-3">
      <div className="flex items-center gap-3">
        <div ref={rowRef} role="group" aria-label="Pages" className="relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-none">
          {pages.map((page, index) => {
            const active = page.id === activePageId;
            const title = page.title?.trim();
            return (
              <div
                key={page.id}
                data-active={active}
                className={`flex shrink-0 items-center rounded-md border bg-body-sm font-semibold ${
                  active
                    ? 'border-(--action-primary-hover) bg-(--accent-soft) text-(--accent-soft-text)'
                    : 'border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:border-(--border-strong)'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                  aria-pressed={active}
                  title={`${title || 'Untitled form'} — ${fieldsText(fieldCounts[page.id] ?? 0)}`}
                  className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-3 focus-visible:outline-2 focus-visible:outline-(--border-focus) lg:min-h-9"
                >
                  <span className="max-w-40 truncate">{title || `Page ${index + 1}`}</span>
                </button>
                {active && pages.length > 1 && (
                  <span className="hidden pr-1 lg:inline-flex">
                    <button
                      type="button"
                      onClick={() => onDeletePage(page.id)}
                      aria-label={`Delete page ${index + 1}`}
                      title="Delete page"
                      className="flex size-7 items-center justify-center rounded text-(--accent-soft-text) hover:bg-(--error-surface) hover:text-(--error-text) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={onAddPage}
            aria-label="Add page"
            title="Add page"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md border border-dashed border-(--border-strong) bg-body-sm font-semibold text-(--text-secondary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus) lg:min-h-9 lg:px-3"
          >
            <Plus size={16} aria-hidden="true" />
            <span className="hidden whitespace-nowrap lg:inline">Add page</span>
          </button>
        </div>
        <span className="hidden shrink-0 bg-body-sm text-(--text-muted) lg:inline">{fieldsText(fieldCounts[activePageId ?? ''] ?? 0)}</span>
      </div>
      <p className="bg-caption text-(--text-muted) lg:hidden">Pages can only be renamed, deleted or reordered on a larger screen. You can still edit your questions here.</p>
    </div>
  );
}
