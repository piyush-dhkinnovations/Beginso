'use client';

import { Pin } from 'lucide-react';
import { bx } from '@/lib/utils';

export interface PinButtonProps {
  title: string;
  pinned: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Icon toggle for the row/card/header. 40px target; filled pin when pinned. Native title tooltip: a CSS
// tooltip got clipped by the card's overflow at the top of the grid.
export function PinButton({ title, pinned, onToggle, disabled }: PinButtonProps) {
  const label = pinned ? `Unpin ${title}` : `Pin ${title}`;
  return (
      <button
        type="button"
        className="bg-btn bg-btn-ghost bg-btn-icon"
        aria-label={label}
        title={pinned ? 'Unpin' : 'Pin to top'}
        aria-pressed={pinned}
        disabled={disabled}
        onClick={onToggle}
      >
        <Pin className={bx('bg-icon', pinned && 'fill-current text-(--action-primary)')} aria-hidden="true" />
      </button>
  );
}
