'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { monthNames } from '@/lib/calendarDates';
import { bx } from '@/lib/utils';

interface CalendarMonthPickerProps {
  year: number;
  month: number; // 0-indexed
  /** "October 2026" - the heading, and the button that opens the picker. */
  label: string;
  onJump: (year: number, month: number) => void;
}

/** The month on screen as the calendar's heading; press it to jump to any month of any year. One control instead of two dropdowns. */
export function CalendarMonthPicker({ year, month, label, onJump }: CalendarMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const months = monthNames('short');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle() {
    if (!open) setPickerYear(year);
    setOpen((v) => !v);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <h3 className="bg-h5 font-bold text-(--text-primary)" aria-live="polite">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          title="Jump to a month"
          onClick={toggle}
          className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus) max-md:min-h-10"
        >
          {label}
          <ChevronDown size={16} className="text-(--text-muted)" aria-hidden="true" />
        </button>
      </h3>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose a month"
          className="absolute left-0 top-full z-30 mt-2 flex w-64 flex-col gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) p-3 shadow-(--shadow-lg)"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous year"
              onClick={() => setPickerYear((y) => y - 1)}
              className="flex size-8 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) max-md:size-10"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="bg-body font-semibold text-(--text-primary)" aria-live="polite">
              {pickerYear}
            </span>
            <button
              type="button"
              aria-label="Next year"
              onClick={() => setPickerYear((y) => y + 1)}
              className="flex size-8 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) max-md:size-10"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div role="group" aria-label={`Months of ${pickerYear}`} className="grid grid-cols-3 gap-1">
            {months.map((name, i) => {
              const current = pickerYear === year && i === month;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={current}
                  onClick={() => {
                    onJump(pickerYear, i);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={bx(
                    'h-9 rounded-md bg-body-sm font-medium transition-colors max-md:h-10',
                    current ? 'bg-(--action-primary) text-(--text-on-brand)' : 'text-(--text-primary) hover:bg-(--surface-hover)'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
