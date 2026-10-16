'use client';

import { useEffect, useState } from 'react';
import { CloudAlert, CloudCheck, CloudOff, LoaderCircle } from 'lucide-react';

// Sprint 13 (CF2.8), requirements.md 1.1. Pure derived label — owns no save state. The three
// states from the feature list are Unsaved changes → Saving… → All changes saved, plus a failure
// state with Retry. It never renders blank once a form is loaded.
export interface SaveIndicatorProps {
  dirty: boolean;
  saving: boolean;
  error: boolean;
  /** Why the save failed, when the server said. */
  detail?: string | null;
  savedAt: Date | null;
  onRetry: () => void;
}

type Label = 'error' | 'saving' | 'unsaved' | 'saved';

export function SaveIndicator({ dirty, saving, error, detail, savedAt, onRetry }: SaveIndicatorProps) {
  const label: Label = saving ? 'saving' : error ? 'error' : dirty ? 'unsaved' : 'saved';

  // Announce once the label has been stable for 500 ms (design.md §18) — not on every keystroke,
  // which flips Unsaved ⇄ Saving… constantly while typing.
  const [announced, setAnnounced] = useState<Label>(label);
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(label), 500);
    return () => clearTimeout(t);
  }, [label]);

  const text: Record<Label, string> = {
    error: detail ? `Save failed: ${detail}` : 'Save failed',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    saved: 'All changes saved',
  };

  return (
    <div className="bg-body-sm select-none flex items-center gap-2">
      <span aria-hidden="true">
        {label === 'saving' ? (
          <span className="inline-flex items-center gap-1.5 text-(--text-muted) font-medium animate-pulse">
            <LoaderCircle size={14} className="animate-spin" /> {text.saving}
          </span>
        ) : label === 'error' ? (
          <span className="inline-flex items-center gap-1.5 text-(--error-text) font-medium">
            <CloudAlert size={14} /> <span className="max-w-64 truncate" title={text.error}>{text.error}</span>
          </span>
        ) : label === 'unsaved' ? (
          <span className="inline-flex items-center gap-1.5 text-(--warning-text) font-medium">
            <CloudOff size={14} /> {text.unsaved}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-(--success-text) font-medium">
            <CloudCheck size={14} /> {text.saved}
            {savedAt && (
              <span className="ml-1 font-normal text-(--text-muted)">
                · {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
        )}
      </span>
      {label === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 px-2 bg-body-sm font-semibold text-(--text-primary) underline underline-offset-2"
        >
          Retry
        </button>
      )}
      <span role="status" className="sr-only">
        {text[announced]}
      </span>
    </div>
  );
}
