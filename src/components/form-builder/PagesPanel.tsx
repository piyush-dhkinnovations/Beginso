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

/** An arrow step: notched where it follows another, pointed where another follows it. The first and last ends stay square. */
function stepShape(first: boolean, last: boolean): string {
  const right = last ? '100% 0, 100% 100%' : 'calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%';
  return `polygon(0 0, ${right}, 0 100%${first ? '' : ', 12px 50%'})`;
}

// The row of page steps above the canvas, drawn as joined arrows in page order. One page is always active; its
// questions are the only ones shown. A step reads its number and the page's name, or "Page N" while it has none. From
// 1024px the active one carries an X that deletes the page (Undo brings it back); below that, renaming and deleting
// stay desktop-only, said so rather than silently missing.
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
        <div role="group" aria-label="Pages" className="flex min-w-0 flex-1 items-center gap-2">
          {/* Only the steps scroll: "Add page" stays in view however many pages there are. */}
          <div ref={rowRef} className="relative flex min-w-0 items-center overflow-x-auto scrollbar-none">
            {pages.map((page, index) => {
              const active = page.id === activePageId;
              const title = page.title?.trim();
              const first = index === 0;
              const last = index === pages.length - 1;
              const clipPath = stepShape(first, last);
              const ends = `${first ? 'rounded-l-md' : ''} ${last ? 'rounded-r-md' : ''}`;
              return (
                <div
                  key={page.id}
                  data-active={active}
                  // The element's own colour is the outline; the layer inside, 1px in (2px on keyboard focus), is the fill.
                  style={{ clipPath }}
                  className={`group relative isolate flex shrink-0 items-center bg-body-sm font-semibold has-focus-visible:bg-(--border-focus) ${ends} ${first ? '' : '-ml-2'} ${
                    active ? 'bg-(--action-primary-hover) text-(--accent-soft-text)' : 'bg-(--border-default) text-(--text-secondary) hover:bg-(--border-strong)'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{ clipPath }}
                    className={`absolute inset-px -z-10 group-has-focus-visible:inset-0.5 ${ends} ${active ? 'bg-(--accent-soft)' : 'bg-(--surface-card)'}`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectPage(page.id)}
                    aria-pressed={active}
                    title={`${title || 'Untitled form'} — ${fieldsText(fieldCounts[page.id] ?? 0)}`}
                    className={`flex min-h-11 min-w-11 items-center justify-center gap-1 outline-none lg:min-h-9 ${first ? 'pl-3' : 'pl-5'} ${
                      active && pages.length > 1 ? (last ? 'pr-3 lg:pr-1' : 'pr-5 lg:pr-1') : last ? 'pr-3' : 'pr-5'
                    }`}
                  >
                    {title && <span aria-hidden="true">{index + 1}.</span>}
                    <span className="max-w-40 truncate">{title || `Page ${index + 1}`}</span>
                  </button>
                  {active && pages.length > 1 && (
                    <span className={`hidden lg:inline-flex ${last ? 'pr-1' : 'pr-3'}`}>
                      <button
                        type="button"
                        onClick={() => onDeletePage(page.id)}
                        aria-label={`Delete page ${index + 1}`}
                        title="Delete page"
                        className="flex size-7 items-center justify-center rounded text-(--accent-soft-text) hover:text-(--error-text) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
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
