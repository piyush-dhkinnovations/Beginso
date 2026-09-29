'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageRef } from '@/types/stage';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.1 (1.1): the fixed `ResponseStatus` union
 * this dropdown validated against is gone — it now picks a workspace stage from data instead of a
 * hardcoded label. Kept as a compiling, working stage picker for `MetadataSidebar`/`ResponseDrawer`
 * (still Phase 4 components per design.md's file list) until task 4.3 replaces this whole sidebar
 * with `WorkflowSidebar`'s stage `<select>`, per design.md §22's "Remove: ... StatusDropdown.tsx
 * (replaced by stage select)".
 */
interface StatusDropdownProps {
  stages: readonly StageRef[];
  currentStageId: string;
  onChange: (stageId: string) => void;
  disabled?: boolean;
}

export function StatusDropdown({ stages, currentStageId, onChange, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentIndex = Math.max(stages.findIndex((s) => s.id === currentStageId), 0);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = stages.find((s) => s.id === currentStageId);

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectStage = (stageId: string) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    if (stageId !== currentStageId) onChange(stageId);
  };

  const openMenu = () => {
    setActiveIndex(Math.max(stages.findIndex((s) => s.id === currentStageId), 0));
    setIsOpen(true);
  };

  if (stages.length === 0) return null;

  return (
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
          setActiveIndex((index) => (index + direction + stages.length) % stages.length);
          return;
        }
        if (isOpen && (e.key === 'Home' || e.key === 'End')) {
          e.preventDefault();
          setActiveIndex(e.key === 'Home' ? 0 : stages.length - 1);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Response stage"
        className="flex min-h-11 min-w-11 items-center gap-1.5 rounded-md border border-(--border-default) bg-(--bg-subtle) px-2.5 py-1 text-body-sm font-medium text-(--text-primary) outline-none transition-colors hover:bg-(--surface-hover) focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-(--action-primary)" />
        {current?.name ?? 'Unknown stage'}
        <ChevronDown size={14} className={cn('shrink-0 text-(--text-muted) transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Stage options"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-(--border-default) bg-(--surface-card) py-1 shadow-md animate-fade-in"
        >
          {stages.map((stage, index) => (
            <li key={stage.id}>
              <button
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="option"
                tabIndex={index === activeIndex ? 0 : -1}
                aria-selected={stage.id === currentStageId}
                onFocus={() => setActiveIndex(index)}
                onClick={() => selectStage(stage.id)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-1.5 px-2.5 py-1 text-left text-[11px] leading-3.5 transition-colors outline-none focus:bg-(--surface-hover)',
                  stage.id === currentStageId ? 'font-medium text-(--text-primary)' : 'font-normal text-(--text-secondary) hover:bg-(--surface-hover)'
                )}
              >
                <span className="flex-1">{stage.name}</span>
                {stage.id === currentStageId && <Check size={12} className="shrink-0 text-(--action-primary)" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
