'use client';

import { Button } from '@/components/ui/Button';
import { STATUS_LABELS, type ResponseStatus } from '@/types/response';

interface StatusSelectorProps {
  currentStatus: ResponseStatus;
  onChange: (s: ResponseStatus) => void;
  disabled?: boolean;
}

const STATUSES: ResponseStatus[] = ['new', 'in_progress', 'completed'];

export function StatusSelector({ currentStatus, onChange, disabled }: StatusSelectorProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Response status">
      {STATUSES.map((s) => (
        <Button
          key={s}
          size="small"
          variant={currentStatus === s ? 'primary' : 'secondary'}
          onClick={() => onChange(s)}
          disabled={disabled}
          aria-pressed={currentStatus === s}
        >
          {STATUS_LABELS[s]}
        </Button>
      ))}
    </div>
  );
}
