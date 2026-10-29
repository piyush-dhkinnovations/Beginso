'use client';

import { Plus, X } from 'lucide-react';
import type { FormPage } from '@/types/form';

export interface PagesPanelProps {
  pages: FormPage[];
  activePageId: string | null;
  fieldCounts: Record<string, number>;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
}

// Small, page-proportioned tile (roughly A4-ish portrait) — matches every tile
// in the rail, whether it's a page number or the trailing "add" tile.
const TILE_CLASS =
  'w-11 h-14 rounded-lg border shrink-0 flex items-center justify-center relative transition-colors';

// ─── Single page tile — click to switch, hover to delete ─────────────────────
// Each page's own title/description is edited from the canvas header (visible
// once that page is active), not from this tile — the tile is pure navigation.

function PageTile({
  page,
  number,
  isActive,
  fieldCount,
  canDelete,
  onSelect,
  onDelete,
}: {
  page: FormPage;
  number: number;
  isActive: boolean;
  fieldCount: number;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      title={`${page.title || 'Untitled form'} — ${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'}`}
      className={`group ${TILE_CLASS} cursor-pointer ${
        isActive
          ? 'border-(--action-primary-hover) bg-(--accent-soft)'
          : 'border-(--border-default) bg-(--surface-card) hover:border-(--border-strong) hover:bg-(--surface-hover)'
      }`}
    >
      <span className={`bg-body font-bold ${isActive ? 'text-(--accent-soft-text)' : 'text-(--text-muted)'}`}>
        {number}
      </span>

      {isActive && <span className="absolute left-1.5 right-1.5 bottom-1 h-0.5 rounded-full bg-(--action-primary-hover)" />}

      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-(--surface-card) border border-(--border-default) text-(--text-muted) hover:text-(--error-text) hover:border-(--error-border) size-5 rounded-full flex items-center justify-center transition-all shadow-(--shadow-sm)"
          aria-label={`Delete page ${number}`}
          title="Delete page"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// ─── Trailing "add page" tile — same shape/size, appended right after the ────
// last page tile in the same vertical stack (not a separate footer button).

function AddPageTile({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      title="Add page"
      aria-label="Add page"
      className={`${TILE_CLASS} border-dashed border-(--border-strong) text-(--text-disabled) hover:border-(--border-focus) hover:text-(--text-link) hover:bg-(--accent-soft)/40`}
    >
      <Plus size={16} />
    </button>
  );
}

// ─── Main panel ─────────────────────────────────────────────────────────────
// Its own separate panel, sitting between the Field Types toolbox and the
// canvas — always visible in the Build tab. One page is always active; its
// fields are the only ones rendered on the canvas at a time.

export function PagesPanel({
  pages,
  activePageId,
  fieldCounts,
  onSelectPage,
  onAddPage,
  onDeletePage,
}: PagesPanelProps) {
  return (
    <aside className="sticky top-16 hidden w-20 shrink-0 flex-col gap-3 self-start rounded-xl border border-(--border-default) bg-(--surface-card) px-2 py-4 lg:flex">
      <h3 className="border-b border-(--border-subtle) pb-3 bg-body font-bold text-(--text-primary) tracking-tight text-center">Pages</h3>

      <div className="flex flex-col items-center gap-3">
        {pages.map((page, index) => (
          <PageTile
            key={page.id}
            page={page}
            number={index + 1}
            isActive={page.id === activePageId}
            fieldCount={fieldCounts[page.id] ?? 0}
            canDelete={pages.length > 1}
            onSelect={() => onSelectPage(page.id)}
            onDelete={() => onDeletePage(page.id)}
          />
        ))}
        <AddPageTile onAdd={onAddPage} />
      </div>
    </aside>
  );
}

// ─── Compact page switcher (< 1024px) ───────────────────────────────────────
// Sprint 13 (CF2.12, requirements.md 4.4). Below 1024px the Pages panel is gone, but editing the
// fields WITHIN each page must still work, so pages stay selectable, and a "+" adds one. Renaming (on the
// canvas header), deleting and rearranging pages stay desktop-only, and are said so rather than silently
// missing.
export function PageSwitcher({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
}: Pick<PagesPanelProps, 'pages' | 'activePageId' | 'onSelectPage' | 'onAddPage'>) {
  return (
    <div className="lg:hidden flex flex-col gap-1 border-b bg-(--surface-card) px-3 py-2 shrink-0">
      <div role="group" aria-label="Pages" className="flex items-center gap-2 overflow-x-auto">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelectPage(page.id)}
              aria-pressed={page.id === activePageId}
              className={`min-h-11 min-w-11 shrink-0 rounded-md border px-3 bg-body-sm font-semibold ${
                page.id === activePageId
                  ? 'border-(--action-primary-hover) bg-(--accent-soft) text-(--accent-soft-text)'
                  : 'border-(--border-default) text-(--text-secondary)'
              }`}
            >
              Page {index + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={onAddPage}
            aria-label="Add page"
            title="Add page"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-(--border-strong) text-(--text-secondary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
      </div>
      <p className="bg-caption text-(--text-muted)">Pages can only be renamed, deleted or reordered on a larger screen. You can still edit your questions here.</p>
    </div>
  );
}
