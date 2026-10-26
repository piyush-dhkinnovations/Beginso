'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CalendarRange, Search, X } from 'lucide-react';
import { CustomRangeModal } from './CustomRangeModal';
import { Input } from '@/components/ui/Input';
import { Toolbar } from '@/components/ui/Toolbar';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { useDebounce } from '@/hooks/useDebounce';
import { RESPONSES_TOOLBAR_SLOT_ID } from '@/lib/responsesToolbarSlot';
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
  onSearchChange: (v: string) => void;
  onFilterChange: (patch: Partial<ResponseFilters>) => void;
  /** View switcher (Table · Board · Calendar · Chart) lives on this bar when provided. */
  /** Controls for the right end of the bar (the saved views and Save view). */
  trailing?: ReactNode;
  /** Lets the bar take the width left in the row it sits in (the form header's). */
  className?: string;
  view?: string;
  /** The removable chips for what is filtered right now: they sit in this bar, after the filter buttons, not on a row of their own. */
  activeFilters?: ReactNode;
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
 * value and closes after a selection). Stage and Unread are the count chips; the count and Table / Board / Calendar are the view switch.
 */
export function ResponsesToolbar({
  search,
  filters,
  members,
  tags,
  onSearchChange,
  onFilterChange,
  trailing,
  className,
  view,
  activeFilters,
}: ResponsesToolbarProps) {
  const [inputValue, setInputValue] = useState(search);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [syncedSearch, setSyncedSearch] = useState(search);
  // A short pause after typing, so the list is asked for once per word, not once per key.
  const debounced = useDebounce(inputValue, 250);

  // External URL change (e.g. a "Clear search" link elsewhere) — adjust state during
  // render rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect.
  // Only when it is not the search this box itself just sent: while typing, the address catches up a moment behind the box, and
  // taking the older value back would drop the letters typed in between.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    if (search !== debounced) setInputValue(search);
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
    <Toolbar className={className}>
      <div className="min-w-50 max-w-sm flex-1">
        <Input
          id="responses-search"
          placeholder="Search responses…"
          aria-label="Search responses"
          className="h-9!"
          leftIcon={<Search size={16} aria-hidden="true" />}
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
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
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

      {/* The calendar picks its own window (the month on screen, with Today / previous / next and month and year pickers), so a
          second date filter here would do nothing to it. */}
      {view !== 'calendar' && (
        <FilterMenu
          label="Date"
          options={DATE_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          selectedIds={filters.from || filters.to ? ['active'] : []}
          valueLabel={dateValueLabel(filters)}
          clearLabel="Any time"
          extraItems={[{ id: 'custom', label: 'Custom range…', icon: <CalendarRange size={14} aria-hidden="true" />, onSelect: () => setRangeOpen(true) }]}
          onSelect={(id) => {
            const preset = DATE_PRESETS.find((p) => p.id === id);
            if (preset) onFilterChange({ from: startOfDaysAgo(preset.days).toISOString(), to: undefined });
          }}
          onClear={() => onFilterChange({ from: undefined, to: undefined })}
        />
      )}

      {/* Duplicates are only flagged by default (nothing auto-hidden); test submissions never count anywhere and are
          hidden by default — these only change what is shown. */}
      <FilterMenu
        label="Show"
        options={[
          { id: 'duplicate', label: 'Similar responses only' },
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

      {view === 'calendar' && <div id={RESPONSES_TOOLBAR_SLOT_ID} className="contents" />}

      {activeFilters}

      {/* The count and the layout switcher stay together on the right, and wrap together when the bar is too narrow for one line. */}
      {trailing && <div className="ml-auto flex flex-wrap items-center gap-3">{trailing}</div>}

      {rangeOpen && <CustomRangeModal isOpen onClose={() => setRangeOpen(false)} from={filters.from} to={filters.to} onApply={(range) => onFilterChange(range)} />}
    </Toolbar>
  );
}
