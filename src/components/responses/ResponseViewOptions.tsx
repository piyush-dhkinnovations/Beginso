'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import { Switch } from '@/components/ui/Switch';
import type { ResponseViewSettings } from '@/types/responseView';

export interface ResponseViewOptionsProps {
  view: ResponseViewSettings;
  onChange: (patch: Partial<ResponseViewSettings>) => void;
  useForAll: boolean;
  onUseForAll: (all: boolean) => void;
  /** Shown only when a personal choice exists, so there is something to go back from. */
  onUseFormDefault?: () => void;
  /** Editors only (the server enforces it too). */
  onSetFormDefault?: () => void;
}

/** Density, empty answers and question numbers, plus where the choice applies. Opened from a three-dot button in the toolbar. A small popover, not a dialog. */
export function ResponseViewOptions({ view, onChange, useForAll, onUseForAll, onUseFormDefault, onSetFormDefault }: ResponseViewOptionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const ids = { empty: `${panelId}-empty`, numbers: `${panelId}-numbers`, all: `${panelId}-all` };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          // Only this popover closes - not the drawer behind it (which checks defaultPrevented).
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <Button
        ref={triggerRef}
        variant="secondary"
        size="small"
        aria-label="View options"
        title="View options"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="px-2 max-md:min-h-10 max-md:min-w-10"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </Button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Response view options"
          className="absolute right-0 top-full z-30 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-lg)"
        >
          <div className="flex flex-col gap-1.5">
            <span className="bg-body-sm font-medium text-(--text-primary)">Density</span>
            <SegmentedRadio
              fullWidth
              ariaLabel="Density"
              value={view.density}
              onChange={(density) => onChange({ density: density as ResponseViewSettings['density'] })}
              options={[
                { id: 'comfortable', label: 'Comfortable' },
                { id: 'compact', label: 'Compact' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor={ids.empty} className="bg-body-sm text-(--text-primary)">Show empty answers</label>
            <Switch id={ids.empty} checked={view.showEmpty} onChange={(showEmpty) => onChange({ showEmpty })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={ids.numbers} className="bg-body-sm text-(--text-primary)">Show question numbers</label>
            <Switch id={ids.numbers} checked={view.showNumbers} onChange={(showNumbers) => onChange({ showNumbers })} />
          </div>

          <div className="flex flex-col gap-2 border-t border-(--border-subtle) pt-3">
            <Checkbox id={ids.all} label="Use for all my forms" checked={useForAll} onChange={(e) => onUseForAll(e.target.checked)} />
            {onUseFormDefault && (
              <button type="button" onClick={onUseFormDefault} className="w-fit bg-body-sm font-medium text-(--text-link) hover:underline">
                Use the form&apos;s default
              </button>
            )}
            {onSetFormDefault && (
              <Button variant="secondary" size="small" onClick={onSetFormDefault} className="w-fit">
                Set as form default
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
