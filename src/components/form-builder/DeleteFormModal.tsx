'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface DeleteFormModalProps {
  isOpen: boolean;
  formTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteFormModal({
  isOpen,
  formTitle,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteFormModalProps) {
  const [typed, setTyped] = useState('');

  // Reset whenever the modal opens — the component stays mounted across opens (the
  // caller just toggles isOpen), and closing via onConfirm doesn't route through onClose,
  // so relying only on a close-time reset left stale input from the previous form typed
  // into the confirm field the next time this modal opened for a different form.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped('');
    }
  }, [isOpen]);

  const canDelete = typed === formTitle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete form?"
      description="This action cannot be undone. All responses will be permanently deleted."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="delete-confirm-input"
            className="block text-body-sm text-neutral-600 mb-1.5"
          >
            Type <span className="font-semibold text-neutral-900">{formTitle}</span> to confirm
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={formTitle}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-body focus:outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 transition-colors"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={!canDelete}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-200 disabled:border-red-200"
          >
            Delete permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
}
