'use client';

import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useNarrow } from '@/hooks/useNarrow';
import { FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import type { FieldType } from '@/types/form';

// The short list a guest sees. Everything else sits behind "More types".
const COMMON: FieldType[] = ['short_text', 'long_text', 'email', 'phone', 'multiple_choice', 'dropdown', 'rating', 'date', 'file_upload'];

function TypeList({ onPick }: { onPick: (t: FieldType) => void }) {
  const [more, setMore] = useState(false);
  const configs = FIELD_TYPE_CONFIG.filter((c) => more || COMMON.includes(c.type));
  const ordered = [...configs.filter((c) => COMMON.includes(c.type)).sort((a, b) => COMMON.indexOf(a.type) - COMMON.indexOf(b.type)), ...configs.filter((c) => !COMMON.includes(c.type))];
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ordered.map(({ type, icon: Icon, label }) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => onPick(type)}
              className="flex min-h-11 w-full items-center gap-2 rounded-md border border-(--border-default) bg-(--surface-card) px-3 py-2 text-left bg-body-sm font-medium text-(--text-secondary) hover:bg-(--surface-hover)"
            >
              <Icon size={16} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}
      </ul>
      {!more && (
        <button type="button" onClick={() => setMore(true)} className="self-start bg-body-sm font-medium text-(--text-link) underline underline-offset-2">
          More types
        </button>
      )}
    </div>
  );
}

// Phone: one "+ Add question" button that opens a bottom sheet.
export function AddQuestionButton({ onAdd }: { onAdd: (t: FieldType) => void }) {
  const [open, setOpen] = useState(false);
  const narrow = useNarrow();
  const pick = (t: FieldType) => {
    onAdd(t);
    setOpen(false);
  };
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center justify-center rounded-lg border border-dashed border-(--border-strong) px-4 bg-body font-medium text-(--text-link) hover:bg-(--accent-soft)"
      >
        + Add question
      </button>
      {narrow && (
        <Drawer isOpen={open} onClose={() => setOpen(false)} title="Add a question" placement="bottom">
          <TypeList onPick={pick} />
        </Drawer>
      )}
    </div>
  );
}
