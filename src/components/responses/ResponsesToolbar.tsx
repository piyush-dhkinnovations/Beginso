'use client';

import { useEffect, useRef, useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';
import type { MemberListItem } from '@/types/team';

interface ResponsesToolbarProps {
  search: string;
  filters: ResponseFilters;
  stages: readonly StageRef[];
  /** Undefined/empty for the personal shell — the assignee filter is hidden there (OQ-9). */
  members?: MemberListItem[];
  total: number;
  onSearchChange: (v: string) => void;
  onFilterChange: (patch: Partial<ResponseFilters>) => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.2). Rebuilt on `components/ui/` —
 * the stage filter now comes from workspace data (`stages` prop), never a hardcoded union
 * (requirements.md §7.1's own rule: "renders the stage's name ... from data, never a hardcoded
 * label"). Tag filter and "Save view" are Phase 2 (task 2.2/2.6) — not built here.
 */
export function ResponsesToolbar({ search, filters, stages, members, total, onSearchChange, onFilterChange }: ResponsesToolbarProps) {
  const [inputValue, setInputValue] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const debounced = useDebounce(inputValue, 300);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // External URL change (e.g. a "Clear search" link elsewhere) — adjust state during
  // render rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setInputValue(search);
  }

  useEffect(() => {
    if (debounced !== search) onSearchChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    if (!isFilterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isFilterOpen]);

  const activeCount = [filters.stageId, filters.assigneeId, filters.unread, filters.duplicate].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-50 max-w-sm">
        <Input
          id="responses-search"
          placeholder="Search responses…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          rightSlot={
            inputValue && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setInputValue('');
                  onSearchChange('');
                }}
                className="flex min-h-11 min-w-11 items-center justify-center text-(--text-muted) hover:text-(--text-secondary)"
              >
                <X size={16} />
              </button>
            )
          }
        />
      </div>

      {/* Sprint 12 close-out: Stage/Assignee/Unread/Duplicate consolidated into one popover —
          four separate controls on the toolbar read as clutter at rest. */}
      <div ref={filterRef} className="relative">
        <Button
          type="button"
          variant="secondary"
          size="small"
          aria-haspopup="dialog"
          aria-expanded={isFilterOpen}
          onClick={() => setIsFilterOpen((v) => !v)}
          className={cn('gap-1.5', isFilterOpen && 'bg-(--surface-hover)')}
        >
          <ListFilter size={15} aria-hidden="true" />
          Filter
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-(--action-primary) px-1 bg-caption font-medium text-(--text-on-brand)">
              {activeCount}
            </span>
          )}
        </Button>

        {isFilterOpen && (
          <div role="dialog" aria-label="Filter responses" className="bg-popover absolute left-0 z-20 mt-1 flex w-70 flex-col gap-4">
            <div>
              <label htmlFor="responses-stage-filter" className="mb-1 block bg-caption font-medium text-(--text-muted)">Stage</label>
              <Select
                id="responses-stage-filter"
                value={filters.stageId ?? 'all'}
                onChange={(e) => onFilterChange({ stageId: e.target.value === 'all' ? undefined : e.target.value })}
              >
                <option value="all">All Stages</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            {members !== undefined && (
              <div>
                <label htmlFor="responses-assignee-filter" className="mb-1 block bg-caption font-medium text-(--text-muted)">Assignee</label>
                <Select
                  id="responses-assignee-filter"
                  value={filters.assigneeId ?? 'all'}
                  onChange={(e) => onFilterChange({ assigneeId: e.target.value === 'all' ? undefined : e.target.value })}
                >
                  <option value="all">Everyone</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="me">Me</option>
                  {members.map((m) => (
                    <option key={m.membershipId} value={m.membershipId}>{m.name}</option>
                  ))}
                </Select>
              </div>
            )}

            <label htmlFor="responses-unread-filter" className="flex items-center justify-between gap-2 bg-body-sm text-(--text-secondary)">
              Unread only
              <Switch id="responses-unread-filter" checked={!!filters.unread} onChange={(checked) => onFilterChange({ unread: checked || undefined })} />
            </label>

            {/* Sprint 12, task 5.5: nothing is auto-hidden by default — duplicates only get flagged. */}
            <label htmlFor="responses-duplicate-filter" className="flex items-center justify-between gap-2 bg-body-sm text-(--text-secondary)">
              Show duplicates
              <Switch id="responses-duplicate-filter" checked={!!filters.duplicate} onChange={(checked) => onFilterChange({ duplicate: checked || undefined })} />
            </label>
          </div>
        )}
      </div>

      <span className="bg-body-sm text-(--text-muted) whitespace-nowrap ml-auto">
        {total} response{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}
