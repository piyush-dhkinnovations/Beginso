'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResponseSignals } from './ResponseSignals';
import { CalendarGrid } from './calendar/CalendarGrid';
import { CalendarToolbar } from './calendar/CalendarToolbar';
import { fetchAllResponses } from '@/lib/fetchAllResponses';
import { formatDayTitle, gridFetchRange, localDateKey, monthGridKeys, todayKey } from '@/lib/calendarDates';
import { responseKeys } from '@/lib/queryKeys';
import { RESPONSES_TOOLBAR_SLOT_ID } from '@/lib/responsesToolbarSlot';
import { detectRespondentIdentity } from '@/lib/formatters';
import { useFormFields } from '@/hooks/useFormFields';
import type { ResponseFilters, IResponse } from '@/types/response';

const subscribeNever = () => () => {};

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
 * day dialog so they can't independently drift on what a calendar item shows
 * (requirements.md §7.4: "every view carries the same signals"). */
export function CalendarItemRow({ response, onSelect }: { response: IResponse; onSelect: (id: string) => void }) {
  const identity = detectRespondentIdentity(response.answers, useFormFields(response.formId), response.respondentEmail);
  const name = identity.label ?? identity.email ?? 'Anonymous';
  return (
    <button
      type="button"
      className="flex flex-col gap-1 rounded-lg border border-(--border-default) p-2 text-left hover:bg-(--surface-hover)"
      onClick={() => onSelect(response._id)}
    >
      <span className="bg-body-sm font-medium text-(--text-primary)">{name}</span>
      <ResponseSignals response={response} density="compact" />
    </button>
  );
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§16 (task 3.3). A month calendar at ≥768px, an agenda
 * list below it (a 7-column grid is unreadable at 375px). Fetches the weeks on screen at once (`fetchAllResponses` bounded by
 * `gridFetchRange`), so the dimmed days of the neighbouring months are complete too.
 *
 * Always a calendar: a month with nothing in it still shows its days (the toolbar says so), never an empty-state in place of the grid.
 * Today / previous / next and the month picker move around. Stage, assignee and the rest are filtered by the page's own chips and
 * toolbar above, which already apply here. Clicking a day opens its card (the date, the count and each response); a chip opens its response directly. Arrow keys move
 * between days.
 */
export function ResponsesCalendar({ scope, formId, filters, timezone, onViewResponse, initialDate }: ResponsesCalendarProps) {
  const today = todayKey(timezone);
  const slot = useSyncExternalStore(subscribeNever, () => document.getElementById(RESPONSES_TOOLBAR_SLOT_ID), () => null);
  const [cursor, setCursor] = useState(() => {
    if (initialDate) return { year: initialDate.getUTCFullYear(), month: initialDate.getUTCMonth() };
    return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 };
  });
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<string | null>(null);
  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);

  const gridKeys = useMemo(() => monthGridKeys(cursor.year, cursor.month), [cursor]);
  const range = gridFetchRange(gridKeys);
  const queryKey = [...responseKeys.list(scope, formId, { ...filters, from: range.from, to: range.to }), 'calendar'];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAllResponses({ formId, ...filters, from: range.from, to: range.to }, scope),
  });

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // Every response on its local day.
  const byDay = useMemo(() => {
    const map = new Map<string, IResponse[]>();
    for (const r of data ?? []) {
      const key = localDateKey(r.submittedAt as string, timezone);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [data, timezone]);

  const shownThisMonth = gridKeys.filter((k) => k.startsWith(monthPrefix)).reduce((n, k) => n + (byDay.get(k)?.length ?? 0), 0);
  const daysWithItems = gridKeys.filter((k) => k.startsWith(monthPrefix) && (byDay.get(k)?.length ?? 0) > 0);
  const isCurrentMonth = monthPrefix === today.slice(0, 7);

  function jumpTo(year: number, month: number) {
    setFocusedKey(null);
    setCursor({ year, month });
  }
  function goToMonth(delta: number) {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    jumpTo(next.getUTCFullYear(), next.getUTCMonth());
  }
  // Page Up / Page Down: the next or previous month, with focus on the same day of the month (the last day if it is shorter).
  function pageMonth(delta: number, fromKey: string) {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    const year = next.getUTCFullYear();
    const month = next.getUTCMonth();
    const day = Math.min(Number(fromKey.slice(8, 10)), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setCursor({ year, month });
    setFocusedKey(key);
    setFocusRequest(key);
  }
  function goToToday() {
    setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
    setFocusedKey(today);
  }
  function openDay(key: string, items: IResponse[]) {
    if (items.length > 0) setOpenDayKey(key); // a day card, even for one response; a chip opens its response directly
  }

  const controls = (
    <CalendarToolbar
      year={cursor.year}
      month={cursor.month}
      monthLabel={monthLabel}
      count={shownThisMonth}
      loading={isLoading}
      timezone={timezone}
      isCurrentMonth={isCurrentMonth}
      onPrev={() => goToMonth(-1)}
      onNext={() => goToMonth(1)}
      onToday={goToToday}
      onJump={jumpTo}
    />
  );

  // In the filter bar (after Show) when it has made room for them; in place otherwise.
  const toolbar = slot ? createPortal(controls, slot) : controls;

  if (isError) {
    return (
      <div className="flex flex-col gap-3">
        {toolbar}
        <EmptyState
          icon={<CalendarDays />}
          title="Unable to load the calendar"
          description="Something went wrong while loading responses for this month."
          actions={
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={isLoading || undefined}>
      {toolbar}
      {/* Desktop/tablet: the month calendar (design.md §16) */}
      <CalendarGrid
        monthLabel={monthLabel}
        gridKeys={gridKeys}
        monthPrefix={monthPrefix}
        byDay={byDay}
        timezone={timezone}
        today={today}
        focusedKey={focusedKey}
        busy={isLoading}
        onFocusKey={setFocusedKey}
        onOpenDay={openDay}
        onOpenResponse={onViewResponse}
        onPageMonth={pageMonth}
        focusRequest={focusRequest}
        onFocusRequestHandled={clearFocusRequest}
      />

      {/* Mobile agenda — a 7-column grid is unreadable at 375px (design.md §16's own note) */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label={`${monthLabel} agenda`}>
        {daysWithItems.map((key) => (
          <li key={key} className="rounded-lg border border-(--border-default) p-2">
            <p className="mb-1 flex items-center gap-2 bg-body-sm font-medium text-(--text-primary)">
              {formatDayTitle(key, 'short')}
              {key === today && <span className="rounded-full bg-(--action-primary) px-2 text-(--text-on-brand)">Today</span>}
            </p>
            <div className="flex flex-col gap-2">
              {(byDay.get(key) ?? []).map((r) => (
                <CalendarItemRow key={r._id} response={r} onSelect={onViewResponse} />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={openDayKey !== null}
        onClose={() => setOpenDayKey(null)}
        title={openDayKey ? formatDayTitle(openDayKey) : ''}
        description={openDayKey ? `${(byDay.get(openDayKey) ?? []).length} response${(byDay.get(openDayKey) ?? []).length === 1 ? '' : 's'}` : undefined}
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
