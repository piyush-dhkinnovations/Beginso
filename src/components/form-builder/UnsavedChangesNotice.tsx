'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/formatters';
import type { BuilderBackup } from '@/lib/builderBackup';

interface UnsavedChangesNoticeProps {
  /** Kept changes that cannot be put back without asking: the form was saved elsewhere since. */
  conflict: BuilderBackup | null;
  onDiscard: () => void;
  onRestore: () => void;
}

/**
 * The question the builder asks about changes it found in this browser when they clash with a newer saved form. Changes
 * that could simply be put back are announced in the builder's bar (SaveIndicator), so nothing pushes the form down.
 */
export function UnsavedChangesNotice({ conflict, onDiscard, onRestore }: UnsavedChangesNoticeProps) {
  return (
    <Modal
      isOpen={!!conflict}
      // Closing without a choice would be a choice: both buttons say what happens.
      onClose={() => {}}
      title="This form changed since your unsaved changes"
      description={
        conflict
          ? `You have changes from ${formatRelativeTime(new Date(conflict.savedAt).toISOString())} that were never saved, but the form has been saved somewhere else since then. Using yours replaces that newer version when you save.`
          : undefined
      }
    >
      <div className="flex flex-col-reverse gap-3 pt-4 border-t border-(--border-subtle) sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onRestore}>
          Use my changes
        </Button>
        <Button type="button" onClick={onDiscard}>
          Keep the saved version
        </Button>
      </div>
    </Modal>
  );
}
