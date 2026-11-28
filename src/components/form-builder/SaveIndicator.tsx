'use client';

import { useEffect, useState } from 'react';
import { CloudAlert, CloudCheck, CloudOff, LoaderCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';

// Pure derived label — owns no save state. The three
// states from the feature list are Unsaved changes → Saving… → All changes saved, plus a failure
// state with Retry. It never renders blank once a form is loaded.
export interface SaveIndicatorProps {
  dirty: boolean;
  saving: boolean;
  error: boolean;
  /** Why the save failed, when the server said. */
  detail?: string | null;
  /** Another tab or person saved this form first: saving has stopped until the page is reloaded. */
  conflict?: boolean;
  /** How many edits would be lost by reloading, shown with the conflict message. */
  unsavedCount?: number;
  onReload?: () => void;
  savedAt: Date | null;
  onRetry: () => void;
  /** When unsaved changes that are back in the editor were kept in this browser; null or unset = nothing was restored. */
  restoredAt?: number | null;
  /** Drops those restored changes and shows the saved form again. */
  onDiscardRestored?: () => void;
  /** One small line without the time, for the tabs strip. A long message is cut short there; Reload and Retry stay in reach. */
  compact?: boolean;
}

type Label = 'conflict' | 'error' | 'saving' | 'unsaved' | 'saved';

export function SaveIndicator({ dirty, saving, error, detail, conflict, unsavedCount = 0, onReload, savedAt, onRetry, restoredAt = null, onDiscardRestored, compact = false }: SaveIndicatorProps) {
  // A conflict outranks everything: "All changes saved" would be a lie while this tab's edits cannot be saved.
  const label: Label = conflict ? 'conflict' : saving ? 'saving' : error ? 'error' : dirty ? 'unsaved' : 'saved';

  const restored = label === 'unsaved' && restoredAt !== null;
  // Announce once the label has been stable for 500 ms — not on every keystroke,
  // which flips Unsaved ⇄ Saving… constantly while typing.
  const [announced, setAnnounced] = useState<Label>(label);
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(label), 500);
    return () => clearTimeout(t);
  }, [label]);

  const text: Record<Label, string> = {
    conflict: 'This form changed in another tab or by someone else. Reload to continue.',
    error: detail ? `Save failed: ${detail}` : 'Save failed',
    saving: 'Saving…',
    unsaved: restored ? 'Your unsaved changes are back' : 'Unsaved changes',
    saved: 'All changes saved',
  };

  const actionClass = `shrink-0 px-2 font-semibold text-(--text-primary) underline underline-offset-2 ${compact ? 'min-h-6 bg-caption' : 'min-h-11 bg-body-sm'}`;
  const longClass = compact ? 'flex min-w-0 items-center gap-x-2 whitespace-nowrap' : 'inline-flex flex-wrap items-center gap-x-2';

  // Outside the one-line strip it wraps, so Reload, Retry and Discard are never cut off by a narrow header.
  return (
    <div className={`select-none flex items-center gap-2 ${compact ? 'min-w-0 bg-caption' : 'flex-wrap whitespace-normal bg-body-sm'}`}>
      <span aria-hidden="true" className={compact ? 'flex min-w-0 items-center' : undefined}>
        {label === 'saving' ? (
          <span className="inline-flex items-center gap-1.5 text-(--text-muted) font-medium animate-pulse">
            <LoaderCircle size={14} className="animate-spin" /> {text.saving}
          </span>
        ) : label === 'conflict' ? (
          <span className={`${longClass} text-(--error-text) font-medium`}>
            <CloudAlert size={14} className="shrink-0" /> <span className={compact ? 'truncate' : undefined} title={text.conflict}>{text.conflict}</span>
            {unsavedCount > 0 && <span className="font-normal">{unsavedCount} unsaved change{unsavedCount === 1 ? '' : 's'}</span>}
          </span>
        ) : label === 'error' ? (
          <span className="inline-flex items-center gap-1.5 text-(--error-text) font-medium">
            <CloudAlert size={14} /> <span className="max-w-64 truncate" title={text.error}>{text.error}</span>
          </span>
        ) : label === 'unsaved' ? (
          <span
            className="inline-flex items-center gap-1.5 text-(--warning-text) font-medium"
            title={restored ? `Kept in this browser ${formatRelativeTime(new Date(restoredAt as number).toISOString())}, not saved yet.` : undefined}
          >
            <CloudOff size={14} className="shrink-0" /> {text.unsaved}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-(--success-text) font-medium">
            <CloudCheck size={14} /> {text.saved}
            {savedAt && !compact && (
              <span className="ml-1 font-normal text-(--text-muted)">
                · {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
        )}
      </span>
      {label === 'conflict' && onReload && (
        <button type="button" onClick={onReload} className={actionClass}>
          Reload
        </button>
      )}
      {restored && onDiscardRestored && (
        <button type="button" onClick={onDiscardRestored} className={actionClass}>
          Discard
        </button>
      )}
      {label === 'error' && (
        <button type="button" onClick={onRetry} className={actionClass}>
          Retry
        </button>
      )}
      <span role="status" className="sr-only">
        {text[announced]}
      </span>
    </div>
  );
}
