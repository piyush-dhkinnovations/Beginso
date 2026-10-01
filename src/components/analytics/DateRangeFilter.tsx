'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ALL_TIME_SENTINEL,
  detectDateRangePreset,
  normalizeDateRange,
  resolveDateRangePreset,
  resolveEffectiveDateRange,
} from '@/lib/dateRange';
import type { DateRangePreset } from '@/types/analytics';

const PRESETS: { value: Exclude<DateRangePreset, 'custom'>; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

interface DateRangeValue {
  from?: string;
  to?: string;
}

interface DateRangeFilterProps {
  /** Controlled mode (Reports' staged, non-URL filters, Thursday) — omit to let the filter own
   * `?from=&to=` in the URL directly (Auto-Dashboard / Workspace Analytics), the same
   * `updateParams` pattern the Responses Hub uses. */
  value?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
}

function toUtcStartOfDayIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

function toUtcEndOfDayIso(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isControlled = value !== undefined;

  const { from, to, preset } = isControlled
    ? { from: value.from, to: value.to, preset: detectDateRangePreset(value.from, value.to) }
    : resolveEffectiveDateRange(searchParams.get('from'), searchParams.get('to'));

  function apply(range: DateRangeValue) {
    if (onChange) {
      onChange(range);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (range.from) params.set('from', range.from);
    else params.delete('from');
    if (range.to) params.set('to', range.to);
    else params.delete('to');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function selectPreset(next: Exclude<DateRangePreset, 'custom'>) {
    if (next === 'all') {
      apply(isControlled ? { from: undefined, to: undefined } : { from: ALL_TIME_SENTINEL, to: ALL_TIME_SENTINEL });
      return;
    }
    apply(resolveDateRangePreset(next));
  }

  function handleFromInputChange(raw: string) {
    if (!raw) return;
    apply(normalizeDateRange(toUtcStartOfDayIso(raw), to ?? toUtcEndOfDayIso(raw)));
  }

  function handleToInputChange(raw: string) {
    if (!raw) return;
    apply(normalizeDateRange(from ?? toUtcStartOfDayIso(raw), toUtcEndOfDayIso(raw)));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={preset === p.value}
            onClick={() => selectPreset(p.value)}
            className={cn(
              'px-3 min-h-11 rounded-full bg-caption font-semibold whitespace-nowrap transition-colors',
              preset === p.value
                ? 'bg-(--action-primary-hover) text-(--text-on-brand)'
                : 'bg-(--surface-card) border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label="Custom range start date"
          value={from ? from.slice(0, 10) : ''}
          onChange={(e) => handleFromInputChange(e.target.value)}
          className="h-9.5 min-h-11 rounded-md px-3 bg-body-sm bg-(--surface-card) border-2 border-(--border-default) focus:border-(--border-strong) outline-none transition-colors"
        />
        <span className="bg-body-sm text-(--text-disabled)">to</span>
        <input
          type="date"
          aria-label="Custom range end date"
          value={to ? to.slice(0, 10) : ''}
          onChange={(e) => handleToInputChange(e.target.value)}
          className="h-9.5 min-h-11 rounded-md px-3 bg-body-sm bg-(--surface-card) border-2 border-(--border-default) focus:border-(--border-strong) outline-none transition-colors"
        />
        {preset === 'custom' && <span className="bg-caption font-semibold text-(--accent-soft-text)">Custom</span>}
      </div>
    </div>
  );
}
