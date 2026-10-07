'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Toolbar } from '@/components/ui/Toolbar';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { Segmented } from '@/components/ui/Segmented';
import { useDebounce } from '@/hooks/useDebounce';
import type { ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';
import type { MemberListItem } from '@/types/team';
import type { Tag } from '@/types/tag';

interface ResponsesToolbarProps {
  search: string;
  filters: ResponseFilters;
  stages?: readonly StageRef[];
  /** Undefined/empty for the personal shell — the assignee filter is hidden there (OQ-9). */
  members?: MemberListItem[];
  /** Workspace tag library; undefined/empty hides the Tags button. */
  tags?: Tag[];
  total: number;
  onSearchChange: (v: string) => void;
  onFilterChange: (patch: Partial<ResponseFilters>) => void;
  /** View switcher (Table · Board · Calendar · Chart) lives on this bar when provided. */
  viewOptions?: { id: string; label: string }[];
  view?: string;
  onViewChange?: (id: string) => void;
}

const DATE_PRESETS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
];

function startOfDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const shortDate = (d: Date) => `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;

/** The text shown on the Date button when a range is active: a preset name when `from` matches one, otherwise the dates. */
function dateValueLabel(filters: ResponseFilters): string | undefined {
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;
  if (!from && !to) return undefined;
  if (from && !to) {
    const preset = DATE_PRESETS.find((p) => dayKey(startOfDaysAgo(p.days)) === dayKey(from));
    if (preset) return preset.label;
    return `Since ${shortDate(from)}`;
  }
  if (from && to) return `${shortDate(from)} – ${shortDate(to)}`;
  return `Until ${shortDate(to as Date)}`;
}

/**
 * One --bg-subtle bar: search, named Tags / Assignee / Date / Show filter buttons (each shows its active
 * value and closes after a selection), and the view switcher. Stage and Unread are the count chips above it.
 */
export function ResponsesToolbar({
  search,
  filters,
  members,
  tags,
  total,
  onSearchChange,
  onFilterChange,
  viewOptions,
  view,
  onViewChange,
}: ResponsesToolbarProps) {
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

  const tagIds = filters.tagIds ?? [];
  const assignee = filters.assigneeId;
  const assigneeOptions = [
    { id: 'me', label: 'Me' },
    { id: 'unassigned', label: 'Unassigned' },
    ...(members ?? []).map((m) => ({ id: m.membershipId, label: m.name })),
  ];
  const showSelected = [filters.duplicate && 'duplicate', filters.includeTest && 'tests'].filter(Boolean) as string[];

  return (
    <Toolbar>
      <div className="min-w-50 max-w-sm flex-1">
        <Input
          id="responses-search"
          placeholder="Search responses…"
          aria-label="Search responses"
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

      {tags && tags.length > 0 && (
        <FilterMenu
          label="Tags"
          options={tags.map((t) => ({ id: t.id, label: t.name }))}
          selectedIds={tagIds}
          valueLabel={tagIds.length > 1 ? `${tagIds.length} tags` : undefined}
          onSelect={(id) => onFilterChange({ tagIds: [id] })}
          onClear={() => onFilterChange({ tagIds: undefined })}
        />
      )}

      {members !== undefined && (
        <FilterMenu
          label="Assignee"
          options={assigneeOptions}
          selectedIds={assignee ? [assignee] : []}
          valueLabel={assignee ? (assigneeOptions.find((o) => o.id === assignee)?.label ?? 'Unknown member') : undefined}
          clearLabel="Anyone"
          onSelect={(id) => onFilterChange({ assigneeId: id })}
          onClear={() => onFilterChange({ assigneeId: undefined })}
        />
      )}

      <FilterMenu
        label="Date"
        options={DATE_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
        selectedIds={filters.from || filters.to ? ['active'] : []}
        valueLabel={dateValueLabel(filters)}
        clearLabel="Any time"
        onSelect={(id) => {
          const preset = DATE_PRESETS.find((p) => p.id === id);
          if (preset) onFilterChange({ from: startOfDaysAgo(preset.days).toISOString(), to: undefined });
        }}
        onClear={() => onFilterChange({ from: undefined, to: undefined })}
      />

      {/* Duplicates are only flagged by default (nothing auto-hidden); test submissions never count anywhere and are
          hidden by default — these only change what is shown. */}
      <FilterMenu
        label="Show"
        options={[
          { id: 'duplicate', label: 'Duplicates only' },
          { id: 'tests', label: 'Include test submissions' },
        ]}
        selectedIds={showSelected}
        valueLabel={showSelected.length > 1 ? `${showSelected.length} options` : undefined}
        clearLabel="Default"
        onSelect={(id) =>
          id === 'duplicate' ? onFilterChange({ duplicate: !filters.duplicate || undefined }) : onFilterChange({ includeTest: !filters.includeTest || undefined })
        }
        onClear={() => onFilterChange({ duplicate: undefined, includeTest: undefined })}
      />

      <span className="ml-auto whitespace-nowrap bg-body-sm text-(--text-muted)">
        {total} response{total === 1 ? '' : 's'}
      </span>
      {viewOptions && view && onViewChange && <Segmented options={viewOptions} value={view} onChange={onViewChange} ariaLabel="Responses view" />}
    </Toolbar>
  );
}
