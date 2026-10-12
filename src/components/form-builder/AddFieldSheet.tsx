'use client';

import { Drawer } from '@/components/ui/Drawer';
import type { FieldType } from '@/types/form';
import { FIELD_GROUPS, FIELD_TYPE_CONFIG } from './Toolbox';

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
      <div className="flex flex-col gap-4">
        {FIELD_GROUPS.map((group) => (
          <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
            <h3 className="bg-overline text-(--text-muted)">{group.label}</h3>
            <ul className="grid grid-cols-2 gap-2">
              {FIELD_TYPE_CONFIG.filter((c) => c.group === group.id).map(({ type, icon: Icon, label }) => (
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
          </section>
        ))}
      </div>
    </Drawer>
  );
}
