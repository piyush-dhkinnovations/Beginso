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
        className="flex min-h-10 min-w-10 items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-body-sm font-medium text-neutral-800 outline-none transition-colors hover:border-neutral-300 hover:bg-white focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[currentStatus])} />
        {STATUS_LABELS[currentStatus]}
        <ChevronDown size={14} className={cn('shrink-0 text-neutral-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Response status options"
          className="absolute right-0 z-10 mt-1 w-32 rounded-md border border-neutral-200 bg-white py-1 shadow-md animate-fade-in"
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
                  'flex min-h-10 w-full items-center gap-1.5 px-2.5 py-1 text-left text-[11px] leading-[14px] transition-colors outline-none focus:bg-neutral-100',
                  status === currentStatus ? 'bg-brand-50 font-medium text-neutral-900' : 'font-normal text-neutral-700 hover:bg-neutral-50'
                )}
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[status])} />
                <span className="flex-1">{STATUS_LABELS[status]}</span>
                {status === currentStatus && <Check size={12} className="shrink-0 text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
