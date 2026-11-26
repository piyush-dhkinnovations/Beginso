'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Phones only: from 640px up the field rail (Toolbox) is on screen, so a second "add" button would be redundant.
// Reordering needs no button at any width: every field card has its own drag handle.
export function MobileBuildBar({ onAddField }: { onAddField: () => void }) {
  return (
    <div className="relative z-10 sm:hidden flex shrink-0 border-t bg-(--surface-card) p-3 shadow-(--shadow-sm)">
      <Button type="button" className="flex-1" onClick={onAddField}>
        <Plus size={16} aria-hidden="true" /> Add field
      </Button>
    </div>
  );
}
