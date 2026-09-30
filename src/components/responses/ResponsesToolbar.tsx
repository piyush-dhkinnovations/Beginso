'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useDebounce } from '@/hooks/useDebounce';
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
                className="flex min-h-11 min-w-11 items-center justify-center text-text-muted hover:text-text-secondary"
              >
                <X size={16} />
              </button>
            )
          }
        />
      </div>

      <Select
        id="responses-stage-filter"
        aria-label="Filter by stage"
        value={filters.stageId ?? 'all'}
        onChange={(e) => onFilterChange({ stageId: e.target.value === 'all' ? undefined : e.target.value })}
      >
        <option value="all">All Stages</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>

      {members !== undefined && (
        <Select
          id="responses-assignee-filter"
          aria-label="Filter by assignee"
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
      )}

      <label htmlFor="responses-unread-filter" className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Switch id="responses-unread-filter" checked={!!filters.unread} onChange={(checked) => onFilterChange({ unread: checked || undefined })} />
        Unread only
      </label>

      {/* Sprint 12, task 5.5: nothing is auto-hidden by default — duplicates only get flagged. */}
      <label htmlFor="responses-duplicate-filter" className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Switch id="responses-duplicate-filter" checked={!!filters.duplicate} onChange={(checked) => onFilterChange({ duplicate: checked || undefined })} />
        Show duplicates
      </label>

      <span className="text-body-sm text-text-muted whitespace-nowrap ml-auto">
        {total} response{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}
