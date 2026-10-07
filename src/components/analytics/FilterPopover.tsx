'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        className={cn(
          'inline-flex min-h-10 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) px-3 bg-body-sm font-semibold text-(--text-primary) hover:bg-(--surface-hover)',
          open && 'bg-(--surface-hover)'
        )}
      >
        <SlidersHorizontal size={16} className="text-(--text-muted)" aria-hidden="true" />
        Filters
        <span className="font-normal text-(--text-muted)">· {summary}</span>
        <ChevronDown size={14} className="text-(--text-muted)" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Analytics filters"
          className="absolute right-0 top-full z-30 mt-2 flex w-[min(92vw,420px)] flex-col gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-lg)"
        >
          {children}
        </div>
      )}
    </div>
  );
}
