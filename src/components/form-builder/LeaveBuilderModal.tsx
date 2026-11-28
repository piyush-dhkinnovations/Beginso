'use client';

import { useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

// The warning before leaving the builder with unsaved changes. Keep editing takes focus: pressing Enter by habit must
// neither leave nor save.
export interface LeaveBuilderModalProps {
  isOpen: boolean;
  formTitle: string;
  /** Auto save is on: the changes were about to be saved by themselves. */
  autoSave?: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}

export function LeaveBuilderModal({ isOpen, formTitle, autoSave = false, saving = false, onSave, onDiscard, onStay }: LeaveBuilderModalProps) {
  const keepRef = useRef<HTMLButtonElement>(null);

  // Modal's focus trap focuses the first focusable (its close button) after mount; move focus to
  // the safe action on the next frame, once the trap has run.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => keepRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const name = formTitle || 'Untitled form';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onStay}
      title="You have unsaved changes"
      description={
        autoSave
          ? `Auto save has not finished saving your changes to "${name}". Save them before you leave?`
          : `Your changes to "${name}" are not saved yet. Save them before you leave?`
      }
    >
      <div className="flex flex-col-reverse gap-3 pt-4 border-t border-(--border-subtle) sm:flex-row sm:items-center">
        <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving} className="text-(--error-text) sm:mr-auto">
          Discard changes
        </Button>
        <Button ref={keepRef} type="button" variant="secondary" onClick={onStay} disabled={saving}>
          Keep editing
        </Button>
        <Button type="button" onClick={onSave} isLoading={saving}>
          Save and leave
        </Button>
      </div>
    </Modal>
  );
}
