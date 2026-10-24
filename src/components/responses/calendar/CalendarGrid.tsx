'use client';

import { useEffect, useRef } from 'react';
import { detectRespondentIdentity } from '@/lib/formatters';
import { formatTimeInZone, weekdayNames } from '@/lib/calendarDates';
import { useFormFields } from '@/hooks/useFormFields';
import { useRespondentFrom } from '../RespondentFromContext';
import { bx } from '@/lib/utils';
import type { IResponse } from '@/types/response';
import { chipClass, stageOf } from './stageChip';

export const MAX_VISIBLE_PER_DAY = 3;

/** One response on its day: a chip in its stage's colour with the respondent and the time. Opens the response. */
function CalendarChip({ response, timezone, onOpen }: { response: IResponse; timezone: string; onOpen: (id: string) => void }) {
  const identity = detectRespondentIdentity(response.answers, useFormFields(response.formId), response.respondentEmail, useRespondentFrom());
  const name = identity.label ?? identity.email ?? 'Response';
  const stage = stageOf(response);
  const time = formatTimeInZone(response.submittedAt as string, timezone);
  return (
    <button
      type="button"
      tabIndex={-1}
      title={`${name} · ${time}${stage ? ` · ${stage.name}` : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(response._id);
      }}
      className={bx(
        'flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left bg-body-sm transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-(--border-focus)',
        chipClass(stage?.colour)
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <span className="shrink-0 font-normal">{time}</span>
    </button>
  );
}

interface CalendarGridProps {
  monthLabel: string;
  gridKeys: string[];
  monthPrefix: string;
  byDay: Map<string, IResponse[]>;
  timezone: string;
  today: string;
  /** The cell that takes the Tab stop (the others are reached with the arrow keys). */
  focusedKey: string | null;
  busy: boolean;
  onFocusKey: (key: string) => void;
  onOpenDay: (key: string, items: IResponse[]) => void;
  onOpenResponse: (id: string) => void;
  /** Page Up / Page Down: change month, keeping the day of the month the focus was on. */
  onPageMonth: (delta: number, fromKey: string) => void;
  /** A day to move focus to once the grid for its month is on screen (after a Page Up / Page Down). */
  focusRequest: string | null;
  onFocusRequestHandled: () => void;
}

const MONTH_ABBR = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });

/**
 * A month as a calendar: weekday headings, full weeks in one ruled grid, weekends shaded, today picked out, and each day's responses
 * as coloured chips (the first three, then "+N more"). Days of the neighbouring months are shown dimmed. Arrow keys move between
 * days, Enter opens a day, Page Up / Page Down change month.
 */
export function CalendarGrid({
  monthLabel,
  gridKeys,
  monthPrefix,
  byDay,
  timezone,
  today,
  focusedKey,
  busy,
  onFocusKey,
  onOpenDay,
  onOpenResponse,
  onPageMonth,
  focusRequest,
  onFocusRequestHandled,
}: CalendarGridProps) {
  const cells = useRef<Record<string, HTMLDivElement | null>>({});
  const weekdays = weekdayNames('short');
  const weeks = Array.from({ length: gridKeys.length / 7 }, (_, w) => gridKeys.slice(w * 7, w * 7 + 7));

  useEffect(() => {
    if (!focusRequest || !cells.current[focusRequest]) return;
    cells.current[focusRequest]?.focus();
    onFocusRequestHandled();
  }, [focusRequest, gridKeys, onFocusRequestHandled]);

  function moveFocus(from: string, delta: number) {
    const next = gridKeys[Math.min(Math.max(gridKeys.indexOf(from) + delta, 0), gridKeys.length - 1)];
    onFocusKey(next);
    cells.current[next]?.focus();
  }

  return (
    <div
      role="grid"
      aria-label={`${monthLabel} calendar`}
      aria-busy={busy || undefined}
      className={bx('hidden overflow-hidden rounded-lg border border-(--border-default) bg-(--border-subtle) md:block', busy && 'opacity-70 transition-opacity')}
    >
      <div role="row" className="grid grid-cols-7 gap-px">
        {weekdays.map((label, i) => (
          <div
            key={label}
            role="columnheader"
            className={bx('bg-(--bg-subtle) py-2 text-center bg-body-sm font-medium', i === 0 || i === 6 ? 'text-(--text-muted)' : 'text-(--text-secondary)')}
          >
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <div key={week[0]} role="row" className="mt-px grid grid-cols-7 gap-px">
          {week.map((key, col) => {
            const items = byDay.get(key) ?? [];
            const inMonth = key.startsWith(monthPrefix);
            const isToday = key === today;
            const weekend = col === 0 || col === 6;
            const dayNum = Number(key.slice(8, 10));
            const isTabbable = focusedKey ? focusedKey === key : key === gridKeys[0];
            return (
              <div
                key={key}
                ref={(el) => {
                  cells.current[key] = el;
                }}
                role="gridcell"
                tabIndex={isTabbable ? 0 : -1}
                aria-current={isToday ? 'date' : undefined}
                className={bx(
                  'flex min-h-32 min-w-0 cursor-pointer flex-col gap-1 p-1.5 text-left outline-none transition-colors hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--border-focus)',
                  inMonth && !weekend ? 'bg-(--surface-card)' : 'bg-(--bg-subtle)'
                )}
                onFocus={() => onFocusKey(key)}
                onClick={() => onOpenDay(key, items)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return; // a chip's own keys are its own
                  if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(key, 1); }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(key, -1); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(key, 7); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(key, -7); }
                  else if (e.key === 'PageDown') { e.preventDefault(); onPageMonth(1, key); }
                  else if (e.key === 'PageUp') { e.preventDefault(); onPageMonth(-1, key); }
                  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDay(key, items); }
                }}
              >
                {/* The cell's name is its visible text (WCAG 2.5.3), led by the full date and count so a screen reader starts there. */}
                <span className="sr-only">{`${key}, ${items.length} response${items.length === 1 ? '' : 's'}`}</span>
                <span
                  className={bx(
                    'inline-flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1.5 bg-body-sm',
                    isToday ? 'bg-(--action-primary) font-semibold text-(--text-on-brand)' : inMonth ? 'font-medium text-(--text-primary)' : 'text-(--text-muted)'
                  )}
                >
                  {dayNum === 1 ? `${dayNum} ${MONTH_ABBR.format(new Date(`${key}T00:00:00.000Z`))}` : dayNum}
                </span>

                <div className="flex min-w-0 flex-col gap-1">
                  {items.slice(0, MAX_VISIBLE_PER_DAY).map((r) => (
                    <CalendarChip key={r._id} response={r} timezone={timezone} onOpen={onOpenResponse} />
                  ))}
                  {items.length > MAX_VISIBLE_PER_DAY && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDay(key, items);
                      }}
                      className="w-fit rounded px-1.5 py-0.5 text-left bg-body-sm font-medium text-(--text-link) hover:underline"
                    >
                      <span>+{items.length - MAX_VISIBLE_PER_DAY}</span> more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
