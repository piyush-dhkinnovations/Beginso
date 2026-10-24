'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { bx } from '@/lib/utils';

interface FilterPopoverProps {
  /** Short summary of what is applied, shown on the button (e.g. "Last 7 days"). */
  summary: string;
  children: ReactNode;
}

// One "Filters" button that holds the date presets, custom range, compare toggle and form picker.
// Outside click and Escape close it; Escape returns focus to the button.
export function FilterPopover({ summary, children }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        // The same height as the other buttons in the header row (Edit form, Add chart), not a taller one of its own.
        // bx, not cn: cn (tailwind-merge) reads bg-btn and bg-btn-secondary as two background colours and drops bg-btn, which is
        // what gives the button its layout and height. shrink-0 + nowrap: in a crowded row the button keeps one line (icon, label,
        // range, arrow) and the row wraps instead.
        className={bx('bg-btn bg-btn-secondary bg-btn-sm shrink-0 whitespace-nowrap', open && 'bg-(--surface-hover)')}
      >
        <SlidersHorizontal size={15} className="text-(--text-muted)" aria-hidden="true" />
        Filters
        <span className="font-normal text-(--text-muted)">· {summary}</span>
        <ChevronDown size={14} className="text-(--text-muted)" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Analytics filters"
          className="absolute left-0 top-full z-30 mt-2 flex max-h-[70dvh] w-[min(92vw,380px)] flex-col overflow-y-auto sm:left-auto sm:right-0 gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-lg)"
        >
          {children}
        </div>
      )}
    </div>
  );
}
