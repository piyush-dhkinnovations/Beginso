'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { ConfirmDeleteState } from './useInboxSelection';
import { DELETE_COPY } from '@/lib/responseCopy';

interface Props {
  confirmDelete: ConfirmDeleteState | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteResponsesModal({ confirmDelete, isDeleting, onClose, onConfirm }: Props) {
  return (
    <Modal
      isOpen={confirmDelete !== null}
      onClose={onClose}
      title={confirmDelete?.mode === 'bulk' ? `Delete ${confirmDelete.count} responses?` : 'Delete this response?'}
      description={confirmDelete?.mode === 'bulk' ? DELETE_COPY.bulk : DELETE_COPY.single}
    >
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} isLoading={isDeleting}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}
