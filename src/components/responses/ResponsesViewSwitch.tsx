'use client';

import { Segmented } from '@/components/ui/Segmented';

const VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'board', label: 'Board' },
  { id: 'calendar', label: 'Calendar' },
];

interface Props {
  /** How many responses match what is on screen. */
  total: number;
  view: string;
  onViewChange: (id: string) => void;
}

/**
 * How many responses there are, and the three ways to look at them, as one switch of the same kind as the form's Insights / Responses
 * switch. The Calendar picks its own month, so the total (which is for every month) is left out there.
 */
export function ResponsesViewSwitch({ total, view, onViewChange }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {view !== 'calendar' && (
        <span className="whitespace-nowrap bg-body-sm text-(--text-secondary)">
          {total} response{total === 1 ? '' : 's'}
        </span>
      )}
      <Segmented options={VIEWS} value={view} onChange={onViewChange} ariaLabel="Responses view" />
    </div>
  );
}
