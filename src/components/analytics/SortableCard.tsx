'use client';

import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ChartSize } from '@/types/charts';

// Desktop (>= 1280): small 1/3, medium 1/2, large full. Tablet: large stays full, small and medium become a
// half. Mobile: everything is full width. Literal class names so Tailwind sees them.
export const CARD_SPAN: Record<ChartSize, string> = {
  small: 'md:col-span-3 xl:col-span-2',
  medium: 'md:col-span-3 xl:col-span-3',
  large: 'md:col-span-6 xl:col-span-6',
};

// Cards in one row are the same height (the grid stretches them).
export const CARD_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-6';

/** One cell of a re-orderable analytics grid; the card places the drag handle where it likes. */
export function SortableCard({ id, size, handleLabel, children }: { id: string; size: ChartSize; handleLabel: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : undefined }}
      className={`${CARD_SPAN[size]} min-w-0`}
    >
      {children(
        <Button
          type="button"
          variant="ghost"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={handleLabel}
          className="bg-btn-icon shrink-0 cursor-grab touch-none"
        >
          <GripVertical size={16} className="bg-icon" />
        </Button>,
      )}
    </div>
  );
}
