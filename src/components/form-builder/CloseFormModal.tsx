'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface CloseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function CloseFormModal({ isOpen, onClose, onConfirm, isPending }: CloseFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Close form?"
      description="The form will stop accepting new responses. You can re-publish it at any time."
    >
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          isLoading={isPending}
        >
          Close form
        </Button>
      </div>
    </Modal>
  );
}
