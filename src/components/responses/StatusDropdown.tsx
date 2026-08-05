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

// Same color tokens Badge.tsx uses per status — a colored pill communicates status at a
// glance without needing a separate static Badge alongside the control that changes it.
const STATUS_STYLES: Record<ResponseStatus, string> = {
  new: 'bg-status-new-bg border-status-new-border text-status-new-text',
  in_progress: 'bg-status-progress-bg border-status-progress-border text-status-progress-text',
  completed: 'bg-status-active-bg border-status-active-border text-status-active-text',
};

const STATUS_DOT: Record<ResponseStatus, string> = {
  new: 'bg-status-new-dot',
  in_progress: 'bg-status-progress-dot',
  completed: 'bg-status-active-dot',
};

export function StatusDropdown({ currentStatus, onChange, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (status !== currentStatus) onChange(status);
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
          e.stopPropagation();
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Response status"
        className={cn(
          'flex items-center gap-2 min-h-[32px] pl-3 pr-2.5 py-1 rounded-full border text-caption font-bold cursor-pointer outline-none transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 disabled:opacity-60 disabled:cursor-not-allowed',
          STATUS_STYLES[currentStatus]
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[currentStatus])} />
        {STATUS_LABELS[currentStatus]}
        <ChevronDown size={14} className={cn('opacity-70 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Response status options"
          className="absolute right-0 z-10 mt-1.5 w-40 py-1 bg-white border border-neutral-200 rounded-lg shadow-lg animate-fade-in"
        >
          {STATUSES.map((status) => (
            <li key={status}>
              <button
                type="button"
                role="option"
                aria-selected={status === currentStatus}
                onClick={() => selectStatus(status)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-body-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
                <span className="flex-1">{STATUS_LABELS[status]}</span>
                {status === currentStatus && <Check size={14} className="text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
