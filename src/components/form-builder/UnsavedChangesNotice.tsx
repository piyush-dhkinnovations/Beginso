'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/formatters';
import type { BuilderBackup } from '@/lib/builderBackup';

interface UnsavedChangesNoticeProps {
  /** When changes now back in the editor were kept; null = nothing was restored. */
  restoredAt: number | null;
  /** Kept changes that cannot be put back without asking: the form was saved elsewhere since. */
  conflict: BuilderBackup | null;
  onSave: () => void;
  onDiscard: () => void;
  onRestore: () => void;
}

const when = (time: number) => formatRelativeTime(new Date(time).toISOString());

/** What the builder says about changes it found in this browser. */
export function UnsavedChangesNotice({ restoredAt, conflict, onSave, onDiscard, onRestore }: UnsavedChangesNoticeProps) {
  return (
    <>
      {restoredAt !== null && (
        <div className="lg:px-6 lg:py-3 xl:px-8">
          {/* One row on a wide screen: it must not push the form far down. */}
          <Alert variant="info" className="items-center">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="m-0">
                <strong>Your unsaved changes are back.</strong> They were kept in this browser {when(restoredAt)} and are not saved yet.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="small" onClick={onSave}>
                  Save now
                </Button>
                <Button size="small" variant="secondary" onClick={onDiscard}>
                  Discard them
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      )}

      <Modal
        isOpen={!!conflict}
        // Closing without a choice would be a choice: both buttons say what happens.
        onClose={() => {}}
        title="This form changed since your unsaved changes"
        description={
          conflict
            ? `You have changes from ${when(conflict.savedAt)} that were never saved, but the form has been saved somewhere else since then. Using yours replaces that newer version when you save.`
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
    </>
  );
}
