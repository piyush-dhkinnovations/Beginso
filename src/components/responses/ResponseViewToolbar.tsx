'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LayoutGrid, List, Search, Table2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import type { SubmittedResponseState } from '@/hooks/useSubmittedResponse';
import { cn } from '@/lib/utils';
import type { ResponseLayout } from '@/types/responseView';
import { ResponseViewOptions } from './ResponseViewOptions';

interface ResponseViewToolbarProps {
  sr: SubmittedResponseState;
  responseId: string;
  /** Editors only - shows "Set as form default" (the server enforces it as well). */
  canSetFormDefault?: boolean;
  className?: string;
}

const LAYOUT_OPTIONS: { id: ResponseLayout; label: string; title: string; icon: ReactNode }[] = [
  { id: 'grid', label: 'Grid', title: 'Two columns', icon: <LayoutGrid size={14} aria-hidden="true" /> },
  { id: 'list', label: 'List', title: 'One column', icon: <List size={14} aria-hidden="true" /> },
  { id: 'table', label: 'Table', title: 'Rows like a table', icon: <Table2 size={14} aria-hidden="true" /> },
];

const LAYOUT_NAME: Record<ResponseLayout, string> = { grid: 'Grid', list: 'List', table: 'Table' };

const isEditable = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Search, the Grid / List / Table switcher and the view options (behind a three-dot button), in one slim bar under the page header,
 * above both columns. Switching is instant - nothing here waits on the network.
 */
export function ResponseViewToolbar({ sr, responseId, canSetFormDefault = false, className }: ResponseViewToolbarProps) {
  const { rv, view, narrow, query, setQuery } = sr;
  const searchRef = useRef<HTMLInputElement>(null);
  const [announce, setAnnounce] = useState('');

  // "/" jumps to the search, like most apps. Never while typing somewhere, never with a modifier key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div role="toolbar" aria-label="Response view" className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <div className="w-full min-w-0 sm:w-72">
        <Input
          ref={searchRef}
          id={`response-search-${responseId}`}
          type="search"
          aria-label="Search in response"
          placeholder="Search in response"
          leftIcon={<Search size={14} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              // Clears the search; a second Escape (empty box) is left to close the drawer.
              e.preventDefault();
              e.stopPropagation();
              setQuery('');
            }
          }}
          className="h-9"
        />
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {narrow ? (
          <p className="bg-body-sm text-(--text-muted)">Shown as a list on small screens</p>
        ) : (
          <SegmentedRadio
            ariaLabel="Layout"
            iconOnlyBelow="lg"
            value={view.layout}
            onChange={(id) => {
              rv.setView({ layout: id as ResponseLayout });
              setAnnounce(`Layout: ${LAYOUT_NAME[id as ResponseLayout]}`);
            }}
            options={LAYOUT_OPTIONS.map(({ id, label, title, icon }) => ({ id, label, title, icon }))}
          />
        )}
        <span role="status" aria-live="polite" className="sr-only">{announce}</span>

        <ResponseViewOptions
          view={view}
          onChange={rv.setView}
          useForAll={rv.useForAll}
          onUseForAll={rv.setUseForAll}
          onUseFormDefault={rv.hasPersonalChoice ? () => void rv.useFormDefault() : undefined}
          onSetFormDefault={canSetFormDefault ? () => void rv.setAsFormDefault() : undefined}
        />
      </div>
    </div>
  );
}
