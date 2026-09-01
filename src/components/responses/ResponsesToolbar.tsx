'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useDebounce } from '@/hooks/useDebounce';
import { STATUS_LABELS, type ResponseStatus } from '@/types/response';

interface ResponsesToolbarProps {
  search: string;
  status: ResponseStatus | 'all';
  total: number;
  onSearchChange: (v: string) => void;
  onStatusChange: (s: ResponseStatus | 'all') => void;
}

export function ResponsesToolbar({ search, status, total, onSearchChange, onStatusChange }: ResponsesToolbarProps) {
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
    <div className="flex items-center gap-3">
      <div className="flex-1 max-w-sm">
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
                className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400 hover:text-neutral-600"
              >
                <X size={16} />
              </button>
            )
          }
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as ResponseStatus | 'all')}
        aria-label="Filter by status"
        className="h-[38px] min-h-[44px] rounded-md px-3 text-[13px] bg-white border-2 border-neutral-200 focus:border-neutral-500 outline-none transition-colors"
      >
        <option value="all">All Statuses</option>
        {(Object.keys(STATUS_LABELS) as ResponseStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      <span className="text-body-sm text-neutral-500 whitespace-nowrap ml-auto">
        {total} response{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}
