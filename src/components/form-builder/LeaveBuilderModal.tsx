'use client';

import { useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

// Sprint 13 (CF2.9), requirements.md 1.2 / wireframe 39. Autosave is the save mechanism, so the
// old "Save and leave" button is gone (OQ-1 default): this guard exists only for the window where
// autosave has not finished. Keep editing is the primary action and takes focus — the safe option.
export interface LeaveBuilderModalProps {
  isOpen: boolean;
  formTitle: string;
  onDiscard: () => void;
  onStay: () => void;
}

export function LeaveBuilderModal({ isOpen, formTitle, onDiscard, onStay }: LeaveBuilderModalProps) {
  const keepRef = useRef<HTMLButtonElement>(null);

  // Modal's focus trap focuses the first focusable (its close button) after mount; move focus to
  // the safe action on the next frame, once the trap has run.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => keepRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onStay}
      title="You have unsaved changes"
      description={`Autosave has not finished. If you leave now, the last few edits to "${formTitle || 'Untitled form'}" will be lost.`}
    >
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-subtle)">
        <Button type="button" variant="secondary" onClick={onDiscard}>
          Discard &amp; leave
        </Button>
        <Button ref={keepRef} type="button" onClick={onStay}>
          Keep editing
        </Button>
      </div>
    </Modal>
  );
}
