'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { isoToLocalDateInput, localDayEndIso, localDayStartIso, validateDateRange } from '@/lib/dateRange';

interface CustomRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The range that is on now (it fills the two dates). */
  from?: string;
  to?: string;
  onApply: (range: { from: string; to: string }) => void;
}

/**
 * "From this day to that day": two dates, each a whole day (the first runs from its start, the last to its end), checked before they are
 * applied. Either end can be left out only by choosing a preset instead, so both are asked for here.
 */
export function CustomRangeModal({ isOpen, onClose, from, to, onApply }: CustomRangeModalProps) {
  const [start, setStart] = useState(from ? isoToLocalDateInput(from) : '');
  const [end, setEnd] = useState(to ? isoToLocalDateInput(to) : '');
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    if (!start || !end) {
      setError('Choose both a start and an end date.');
      return;
    }
    const range = { from: localDayStartIso(start), to: localDayEndIso(end) };
    const problem = validateDateRange(range.from, range.to);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onApply(range);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pick a date range" description="Show the responses submitted from one day to another, both days included.">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="range-from" label="From" type="date" value={start} max={end || undefined} onChange={(e) => { setStart(e.target.value); setError(null); }} aria-invalid={!!error || undefined} />
          <Input id="range-to" label="To" type="date" value={end} min={start || undefined} onChange={(e) => { setEnd(e.target.value); setError(null); }} aria-invalid={!!error || undefined} />
        </div>
        {error && (
          <p role="alert" className="bg-body-sm text-(--error-text)">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}
