'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface DeleteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteFormModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteFormModalProps) {
  const [, setConfirmText] = useState('');

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    setConfirmText('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Form"
      description="This action cannot be undone. All responses will be permanently deleted."
    >
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          isLoading={isDeleting}
          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}
