'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useNarrow } from '@/hooks/useNarrow';
import { cn } from '@/lib/utils';
import type { PublicFormSchema } from '@/types/publicForm';
import { GuestPreviewFrame } from './GuestPreviewFrame';

// Full-screen preview of the form as a respondent sees it. Esc or the close button returns to editing.
export function GuestPreviewOverlay({ schema, onClose }: { schema: PublicFormSchema; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();
  const [chosen, setChosen] = useState<'desktop' | 'mobile' | null>(null);
  const device = chosen ?? (narrow ? 'mobile' : 'desktop'); // a phone starts on the phone view
  useFocusTrap(true, onClose, ref);
  if (typeof document === 'undefined') return null;

  const options = [
    { id: 'desktop' as const, label: 'Desktop', icon: Monitor },
    { id: 'mobile' as const, label: 'Mobile', icon: Smartphone },
  ];

  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Form preview" className="fixed inset-0 z-90 flex flex-col bg-(--bg-subtle)">
      <header className="flex items-center justify-between gap-3 border-b border-(--border-default) bg-(--surface-card) px-4 py-2">
        <p className="bg-body font-medium text-(--text-primary)">Preview</p>
        <div className="flex gap-1" role="group" aria-label="Preview size">
          {options.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => setChosen(id)}
              className={cn('inline-flex min-h-11 items-center gap-2 rounded-md px-3 bg-body-sm font-medium', device === id ? 'bg-(--accent-soft) text-(--accent-soft-text)' : 'text-(--text-secondary) hover:bg-(--surface-hover)')}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="small" onClick={onClose} aria-label="Close preview" className="min-h-11 min-w-11">
          <X size={18} />
        </Button>
      </header>
      <div className="min-h-0 flex-1 p-2 sm:p-4">
        <GuestPreviewFrame schema={schema} fill device={device} title="Your form, as people will see it" />
      </div>
    </div>,
    document.body
  );
}
