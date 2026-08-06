'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, type ResponseStatus } from '@/types/response';

interface StatusDropdownProps {
  currentStatus: ResponseStatus;
  onChange: (s: ResponseStatus) => void;
  disabled?: boolean;
}

const STATUSES = Object.keys(STATUS_LABELS) as ResponseStatus[];

// Same color tokens Badge.tsx uses per status — the dot alone carries the color-coding here
// (reference design uses a neutral pill for the trigger, not a per-status colored badge).
const STATUS_DOT: Record<ResponseStatus, string> = {
  new: 'bg-status-new-dot',
  in_progress: 'bg-status-progress-dot',
  completed: 'bg-status-active-dot',
};

export function StatusDropdown({ currentStatus, onChange, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => STATUSES.indexOf(currentStatus));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  // Same outside-click pattern as UserProfileDropdown.
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectStatus = (status: ResponseStatus) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    if (status !== currentStatus) onChange(status);
  };

  const openMenu = () => {
    setActiveIndex(Math.max(STATUSES.indexOf(currentStatus), 0));
    setIsOpen(true);
  };

  return (
    // stopPropagation on Escape so this only closes the menu — without it, the keydown
    // bubbles to ResponseDrawer's document-level Escape listener and closes the whole
    // drawer instead of just the status menu.
    <div
      className="relative inline-block"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          triggerRef.current?.focus();
          return;
        }
        if (e.key === 'Tab' && isOpen) {
          setIsOpen(false);
          return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (!isOpen) {
            openMenu();
            return;
          }
          const direction = e.key === 'ArrowDown' ? 1 : -1;
          setActiveIndex((index) => (index + direction + STATUSES.length) % STATUSES.length);
          return;
        }
        if (isOpen && (e.key === 'Home' || e.key === 'End')) {
          e.preventDefault();
          setActiveIndex(e.key === 'Home' ? 0 : STATUSES.length - 1);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else openMenu();
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Response status"
        className="flex items-center gap-1.5 min-h-10 min-w-10 pl-2.5 pr-2 py-1.5 rounded-lg border border-neutral-200 bg-white shadow-sm text-heading-3 font-medium text-neutral-800 cursor-pointer outline-none transition-colors hover:border-neutral-300 focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', STATUS_DOT[currentStatus])} />
        {STATUS_LABELS[currentStatus]}
        <ChevronDown size={16} className={cn('text-neutral-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Response status options"
          className="absolute right-0 z-10 mt-1.5 w-40 py-1.5 bg-white border border-neutral-100 rounded-lg shadow-lg animate-fade-in"
        >
          {STATUSES.map((status, index) => (
            <li key={status}>
              <button
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="option"
                tabIndex={index === activeIndex ? 0 : -1}
                aria-selected={status === currentStatus}
                onFocus={() => setActiveIndex(index)}
                onClick={() => selectStatus(status)}
                className={cn(
                  'w-full flex items-center gap-2 min-h-10 px-3 py-1.5 text-body-sm text-left transition-colors outline-none focus:bg-neutral-100',
                  status === currentStatus ? 'bg-brand-50 text-neutral-900 font-semibold' : 'text-neutral-700 font-medium hover:bg-neutral-50'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[status])} />
                <span className="flex-1">{STATUS_LABELS[status]}</span>
                {status === currentStatus && <Check size={14} className="text-brand-600 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
