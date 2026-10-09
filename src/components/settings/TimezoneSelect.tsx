'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { bx } from '@/lib/utils';

export interface TimezoneSelectProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
}

interface Zone {
  id: string;
  /** "Kolkata", "New York", "UTC" */
  city: string;
  /** "Asia", "America / Argentina" — the part before the city */
  region: string;
  /** "UTC+05:30" */
  offset: string;
  /** Lower-cased text the search matches against. */
  haystack: string;
}

// Friendly names people actually type (country / common name) that the IANA id does not contain.
const ALIASES: Record<string, string> = {
  'Asia/Kolkata': 'india mumbai delhi bangalore chennai ist',
  'Asia/Calcutta': 'india mumbai delhi',
  'Asia/Dubai': 'uae emirates gulf',
  'Asia/Shanghai': 'china beijing',
  'Asia/Tokyo': 'japan',
  'Asia/Seoul': 'korea',
  'Asia/Karachi': 'pakistan',
  'Asia/Dhaka': 'bangladesh',
  'Europe/London': 'uk united kingdom britain england gmt bst',
  'America/New_York': 'eastern est edt usa us',
  'America/Chicago': 'central cst cdt usa us',
  'America/Denver': 'mountain mst mdt usa us',
  'America/Los_Angeles': 'pacific pst pdt usa us california',
  'Australia/Sydney': 'australia aest',
  'Pacific/Auckland': 'new zealand nz',
  UTC: 'utc gmt coordinated universal time',
};

const FALLBACK_IDS = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Australia/Sydney',
];

const pretty = (s: string) => s.replace(/_/g, ' ');

function offsetOf(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? '';
    if (part === 'GMT') return 'UTC+00:00';
    return part.replace('GMT', 'UTC');
  } catch {
    return '';
  }
}

function toZone(id: string): Zone {
  const parts = id.split('/');
  const city = pretty(parts[parts.length - 1]);
  const region = parts.length > 1 ? parts.slice(0, -1).map(pretty).join(' / ') : '';
  const offset = offsetOf(id);
  return { id, city, region, offset, haystack: `${id} ${pretty(id)} ${city} ${region} ${offset} ${ALIASES[id] ?? ''}`.toLowerCase() };
}

// Built once, on first open — ~400 Intl formatters is cheap but not free.
let cache: Zone[] | null = null;
function allZones(): Zone[] {
  if (cache) return cache;
  let ids: string[];
  try {
    ids = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? FALLBACK_IDS;
  } catch {
    ids = FALLBACK_IDS;
  }
  if (!ids.includes('UTC')) ids = ['UTC', ...ids];
  cache = ids.map(toZone);
  return cache;
}

const labelOf = (z: Zone) => `${z.city}${z.region ? ` · ${z.region}` : ''}`;

// Searchable timezone picker (ARIA combobox). Type a city, country, region or offset ("kolkata", "india",
// "utc+5:30"), use ↑ ↓ Enter, or click. Only a real IANA zone can be chosen, so the value is always valid.
export function TimezoneSelect({ id, label, value, onChange, onBlur, error }: TimezoneSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // null = no arrow/hover movement yet: the highlighted row is the selected zone (or the first match).
  const [cursor, setCursor] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const zones = useMemo(() => (open ? allZones() : []), [open]);
  // A saved value outside the current IANA list (legacy alias) must still display and stay selectable.
  const current = useMemo(() => (value ? (zones.find((z) => z.id === value) ?? toZone(value)) : null), [value, zones]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!q) return zones;
    const terms = q.split(' ');
    return zones.filter((z) => terms.every((t) => z.haystack.includes(t)));
  }, [zones, query]);

  const selectedIndex = !query ? results.findIndex((z) => z.id === value) : -1;
  const active = Math.min(cursor ?? Math.max(selectedIndex, 0), Math.max(results.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(refocus: boolean) {
    setOpen(false);
    setQuery('');
    setCursor(null);
    onBlur?.();
    if (refocus) inputRef.current?.focus();
  }

  function pick(z: Zone) {
    onChange(z.id);
    close(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (!results.length) return;
      setCursor((e.key === 'ArrowDown' ? active + 1 : active - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (open) {
        e.preventDefault(); // never submit the settings form from the picker
        if (results[active]) pick(results[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      }
    } else if (e.key === 'Tab') {
      if (open) close(false);
    }
  }

  const shown = open ? query : current ? `${labelOf(current)} (${current.offset})` : '';

  return (
    <div ref={wrapRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={open && current ? `${labelOf(current)} (${current.offset})` : 'Search a city, country or region, e.g. Kolkata'}
        value={shown}
        error={error}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(null);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        rightSlot={<ChevronDown aria-hidden="true" className={bx('size-4 text-(--text-muted) transition-transform', open && 'rotate-180')} />}
      />

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Timezones"
          className="absolute inset-x-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-(--border-default) bg-(--surface-card) p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li role="presentation" className="px-3 py-6 text-center bg-body-sm text-(--text-muted)">No timezone matches “{query}”.</li>
          ) : (
            results.map((z, i) => {
              const selected = z.id === value;
              return (
                <li
                  key={z.id}
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  // mousedown (not click) so the pick lands before the input loses focus
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(z);
                  }}
                  onMouseMove={() => setCursor(i)}
                  className={bx(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2',
                    i === active && 'bg-(--surface-hover)',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate bg-body-sm font-medium text-(--text-primary)">{z.city}</span>
                    <span className="block truncate bg-caption text-(--text-muted)">{z.region || z.id}</span>
                  </span>
                  <span className="flex flex-none items-center gap-2 bg-caption tabular-nums text-(--text-secondary)">
                    {z.offset}
                    {selected && <Check aria-hidden="true" className="size-4 text-(--action-primary)" />}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
