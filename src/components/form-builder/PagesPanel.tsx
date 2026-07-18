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
  'w-14 h-[76px] rounded-lg border-2 shrink-0 flex items-center justify-center relative transition-colors';

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
          ? 'border-brand-700 bg-brand-50'
          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
      }`}
    >
      <span className={`text-heading-2 font-bold ${isActive ? 'text-brand-700' : 'text-neutral-500'}`}>
        {number}
      </span>

      {isActive && <span className="absolute left-2 right-2 bottom-1.5 h-[3px] rounded-full bg-brand-700" />}

      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-white border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:border-rose-300 w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-sm"
          aria-label={`Delete page ${number}`}
          title="Delete page"
        >
          <X size={11} />
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
      className={`${TILE_CLASS} border-dashed border-neutral-300 text-neutral-400 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50/40`}
    >
      <Plus size={18} />
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
    <aside className="w-[92px] bg-neutral-50 flex flex-col shrink-0 overflow-y-auto p-3 gap-3">
      <h3 className="text-heading-3 font-bold text-neutral-800 tracking-tight text-center">Pages</h3>

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
