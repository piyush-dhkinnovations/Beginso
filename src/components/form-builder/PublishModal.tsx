'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function PublishModal({ isOpen, onClose, onConfirm, isPending }: PublishModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish form?"
      description="Your form will be live and accessible to anyone with the link. You can close it at any time."
    >
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} isLoading={isPending}>
          Publish
        </Button>
      </div>
    </Modal>
  );
}
