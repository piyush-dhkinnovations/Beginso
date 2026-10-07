'use client';

import { Drawer } from '@/components/ui/Drawer';
import type { FieldType } from '@/types/form';
import { FIELD_TYPE_CONFIG } from './Toolbox';

// Sprint 13 (CF2.12), requirements.md 4.2. The toolbox below 1024px: a bottom sheet that APPENDS the
// chosen field to the end of the active page — no dragging to a position. The caller (edit page) owns
// what happens after the add (scroll the new card into view and expand it).
export interface AddFieldSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: FieldType) => void;
}

export function AddFieldSheet({ isOpen, onClose, onAdd }: AddFieldSheetProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Add a field" description="It is added to the end of this page." placement="bottom">
      <ul className="grid grid-cols-2 gap-2">
        {FIELD_TYPE_CONFIG.map(({ type, icon: Icon, label }) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => {
                onAdd(type);
                onClose();
              }}
              className="flex w-full min-h-11 items-center gap-3 rounded-md border border-(--border-default) bg-(--surface-card) px-3 py-2.5 text-left transition-colors hover:bg-(--surface-hover) hover:border-(--border-strong)"
            >
              <Icon size={16} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
              <span className="bg-body font-medium text-(--text-secondary)">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
