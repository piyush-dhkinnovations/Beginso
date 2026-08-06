'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface LeaveBuilderModalProps {
  isOpen: boolean;
  onSaveAndLeave: () => void;
  onLeaveWithoutSaving: () => void;
  onStay: () => void;
  isSaving: boolean;
}

export function LeaveBuilderModal({
  isOpen,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onStay,
  isSaving,
}: LeaveBuilderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onStay}
      title="You have unsaved changes"
      description="If you leave now, your recent changes will be lost."
    >
      <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100">
        <Button type="button" onClick={onSaveAndLeave} isLoading={isSaving}>
          Save and leave
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onLeaveWithoutSaving}
          disabled={isSaving}
        >
          Leave without saving
        </Button>
        <button
          type="button"
          onClick={onStay}
          disabled={isSaving}
          className="min-h-11 text-body-sm text-neutral-500 hover:text-neutral-700 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed py-1"
        >
          Stay
        </button>
      </div>
    </Modal>
  );
}
