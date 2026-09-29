'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ResponseSignals } from './ResponseSignals';
import { fetchAllResponses } from '@/lib/fetchAllResponses';
import { monthFetchRange, monthGridKeys, localDateKey } from '@/lib/calendarDates';
import { responseKeys } from '@/lib/queryKeys';
import { detectRespondentIdentity } from '@/lib/formatters';
import { bx } from '@/lib/utils';
import type { ResponseFilters, IResponse } from '@/types/response';

const MAX_VISIBLE_PER_DAY = 3;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface ResponsesCalendarProps {
  scope: string;
  formId?: string;
  filters: ResponseFilters;
  /** IANA timezone (design.md's own acceptance case: a 23:30 UTC submission must land on the
   * correct local day for an IST workspace) — see `useWorkspaceTimezone`. */
  timezone: string;
  onViewResponse: (id: string) => void;
  /** Seeds the initially-visible month — defaults to now. Exposed mainly so tests don't depend on
   * the real wall-clock month to find a fixture rendered in the grid. */
  initialDate?: Date;
}

/** One response's identity + full signal set — reused by both the mobile agenda list and the
 * "+N" day-overflow modal so they can't independently drift on what a calendar item shows
 * (requirements.md §7.4: "every view carries the same signals"). */
export function CalendarItemRow({ response, onSelect }: { response: IResponse; onSelect: (id: string) => void }) {
  const identity = detectRespondentIdentity(response.answers);
  const name = identity.label ?? identity.email ?? 'Anonymous';
  return (
    <button
      type="button"
      className="flex flex-col gap-1 rounded-lg border border-(--border-default) p-2 text-left"
      onClick={() => onSelect(response._id)}
    >
      <span className="text-body-sm font-medium text-text-primary">{name}</span>
      <ResponseSignals response={response} density="compact" />
    </button>
  );
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§16 (task 3.3). Month
 * grid at ≥768px; agenda list below it — a 7-column grid is unreadable at 375px (design.md §16's
 * own note). Fetches one month at a time (`fetchAllResponses` bounded by `monthFetchRange`).
 * Arrow-key navigation via a roving `tabIndex` across day cells; Enter opens (a single item goes
 * straight to the response, more than one opens the day's list in a modal).
 */
export function ResponsesCalendar({ scope, formId, filters, timezone, onViewResponse, initialDate }: ResponsesCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = initialDate ?? new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  });
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const range = monthFetchRange(cursor.year, cursor.month);
  const queryKey = [...responseKeys.list(scope, formId, { ...filters, from: range.from, to: range.to }), 'calendar'];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAllResponses({ formId, ...filters, from: range.from, to: range.to }, scope),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, IResponse[]>();
    (data ?? []).forEach((r) => {
      const key = localDateKey(r.submittedAt, timezone);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    });
    return map;
  }, [data, timezone]);

  const gridKeys = useMemo(() => monthGridKeys(cursor.year, cursor.month), [cursor]);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const daysWithItems = gridKeys.filter((k) => k.startsWith(monthPrefix) && (byDay.get(k)?.length ?? 0) > 0);

  function goToMonth(delta: number) {
    setFocusedKey(null);
    setCursor((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  function moveFocus(delta: number) {
    const index = focusedKey ? gridKeys.indexOf(focusedKey) : 0;
    const nextIndex = Math.min(Math.max(index + delta, 0), gridKeys.length - 1);
    setFocusedKey(gridKeys[nextIndex]);
  }

  function openDay(key: string, items: IResponse[]) {
    if (items.length === 1) onViewResponse(items[0]._id);
    else if (items.length > 1) setOpenDayKey(key);
  }

  const header = (
    <div className="flex items-center justify-between">
      <h3 className="text-heading-2 font-bold text-text-primary">{monthLabel}</h3>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="small" aria-label="Previous month" onClick={() => goToMonth(-1)}>
          <ChevronLeft size={16} />
        </Button>
        <Button variant="ghost" size="small" aria-label="Next month" onClick={() => goToMonth(1)}>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {header}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} variant="block" height={80} className="rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <EmptyState
          icon={<CalendarDays />}
          heading="Unable to load the calendar"
          body="Something went wrong while loading responses for this month."
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {header}

      {daysWithItems.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          heading="No responses this month"
          body="Nothing was submitted in this month for the current filters."
        />
      ) : (
        <>
          {/* Desktop/tablet month grid (design.md §16) */}
          <div className="hidden md:grid grid-cols-7 gap-1" role="grid" aria-label={`${monthLabel} calendar`}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} role="columnheader" className="py-1 text-center text-caption text-text-muted">
                {label}
              </div>
            ))}
            {gridKeys.map((key) => {
              const items = byDay.get(key) ?? [];
              const inMonth = key.startsWith(monthPrefix);
              const dayNum = Number(key.slice(8, 10));
              const isTabbable = focusedKey ? focusedKey === key : key === gridKeys[0];
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  tabIndex={isTabbable ? 0 : -1}
                  aria-label={`${key}, ${items.length} response${items.length === 1 ? '' : 's'}`}
                  className={bx(
                    'flex min-h-20 flex-col items-start gap-1 rounded-lg border border-(--border-default) p-1.5 text-left',
                    !inMonth && 'opacity-40'
                  )}
                  onFocus={() => setFocusedKey(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(1); }
                    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(-1); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(7); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-7); }
                    else if (e.key === 'Enter') { e.preventDefault(); openDay(key, items); }
                  }}
                  onClick={() => openDay(key, items)}
                >
                  <span className="text-caption text-text-muted">{dayNum}</span>
                  {items.slice(0, MAX_VISIBLE_PER_DAY).map((r) => (
                    <span key={r._id} className="w-full truncate text-caption text-text-primary">
                      {detectRespondentIdentity(r.answers).label ?? detectRespondentIdentity(r.answers).email ?? 'Response'}
                    </span>
                  ))}
                  {items.length > MAX_VISIBLE_PER_DAY && (
                    <span className="text-caption text-brand-600">+{items.length - MAX_VISIBLE_PER_DAY}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile agenda — a 7-column grid is unreadable at 375px (design.md §16's own note) */}
          <ul className="flex md:hidden flex-col gap-2" aria-label={`${monthLabel} agenda`}>
            {daysWithItems.map((key) => (
              <li key={key} className="rounded-lg border border-(--border-default) p-2">
                <p className="mb-1 text-body-sm font-medium text-text-primary">{key}</p>
                <div className="flex flex-col gap-2">
                  {(byDay.get(key) ?? []).map((r) => (
                    <CalendarItemRow key={r._id} response={r} onSelect={onViewResponse} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        isOpen={openDayKey !== null}
        onClose={() => setOpenDayKey(null)}
        title={openDayKey ?? ''}
        description={openDayKey ? `${(byDay.get(openDayKey) ?? []).length} responses` : undefined}
      >
        <div className="flex flex-col gap-2">
          {(openDayKey ? byDay.get(openDayKey) ?? [] : []).map((r) => (
            <CalendarItemRow
              key={r._id}
              response={r}
              onSelect={(id) => {
                setOpenDayKey(null);
                onViewResponse(id);
              }}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
}
