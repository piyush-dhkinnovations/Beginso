'use client';

import { Grid2x2, LayoutList } from 'lucide-react';
import { bx } from '@/lib/utils';
import type { FormsView } from '@/hooks/useFormsView';

const BASE = 'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors';

export function FormsViewToggle({ value, onChange }: { value: FormsView; onChange: (v: FormsView) => void }) {
  const option = (view: FormsView, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={value === view}
      onClick={() => onChange(view)}
      className={bx(BASE, value === view ? 'bg-(--accent-soft) text-(--accent-soft-text)' : 'text-(--text-muted) hover:bg-(--surface-hover)')}
    >
      {icon}
    </button>
  );
  return (
    <span role="group" aria-label="Forms view" className="inline-flex gap-1 rounded-lg border border-(--border-default) bg-(--surface-card) p-1">
      {option('list', 'List view', <LayoutList size={16} />)}
      {option('grid', 'Grid view', <Grid2x2 size={16} />)}
    </span>
  );
}
