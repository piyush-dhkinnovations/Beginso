'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CalendarMonthPicker } from './CalendarMonthPicker';

interface CalendarToolbarProps {
  year: number;
  month: number; // 0-indexed
  monthLabel: string;
  /** Responses in this month that are showing. */
  count: number;
  loading: boolean;
  /** The IANA timezone the days and times are in, said once here so no separate note is needed. */
  timezone: string;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onJump: (year: number, month: number) => void;
}

/** The calendar's one control bar: Today, previous / next, the month (press it to jump to any month), and what the month holds. */
export function CalendarToolbar({ year, month, monthLabel, count, loading, timezone, isCurrentMonth, onPrev, onNext, onToday, onJump }: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="small" onClick={onToday} disabled={isCurrentMonth} className="max-md:min-h-10">
          Today
        </Button>
        <Button variant="ghost" size="small" aria-label="Previous month" onClick={onPrev} className="max-md:min-h-10 max-md:min-w-10">
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="small" aria-label="Next month" onClick={onNext} className="max-md:min-h-10 max-md:min-w-10">
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>

      <div className="flex h-9 min-w-0 items-center gap-2">
        <CalendarMonthPicker year={year} month={month} label={monthLabel} onJump={onJump} />
        <p className="truncate bg-body-sm text-(--text-muted)">
          {loading ? 'Loading…' : count === 0 ? <span>No responses this month</span> : `${count} response${count === 1 ? '' : 's'}`}
          {' · '}
          <span title="The days and times on this calendar are in this timezone">{timezone.replace(/_/g, ' ')}</span>
        </p>
      </div>
    </div>
  );
}
