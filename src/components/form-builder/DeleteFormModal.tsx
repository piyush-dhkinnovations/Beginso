'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface DeleteFormModalProps {
  isOpen: boolean;
  /** Single-delete mode (default): pass the form's own title — the strict typed-confirmation
   * stays required, unchanged from before. */
  formTitle?: string;
  /** Bulk-delete mode (sprint-10-events-migration, task 6.4): pass a count instead — typing
   * every selected form's title isn't meaningful across a mixed selection, so bulk mode drops
   * to a plain confirm button, matching the weight of every other bulk-destructive confirm
   * already in this app (e.g. Team's revoke-invite modal has no typed input either). */
  count?: number;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteFormModal({
  isOpen,
  formTitle,
  count,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteFormModalProps) {
  // Bulk mode is selected by which prop the caller passes, not by count's magnitude — a single
  // form selected via a bulk-selection checkbox still goes through the lighter confirm (no typed
  // title), since that's a deliberate checkbox selection, not the row menu's single-item
  // "Delete" click. Real bug this guards: `count > 1` would fall through to single mode at
  // count === 1 with no `formTitle` ever passed in that caller, permanently disabling confirm.
  const isBulk = typeof count === 'number';
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

  const canDelete = isBulk || typed === formTitle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBulk ? `Delete ${count} form${count === 1 ? '' : 's'}?` : 'Delete form?'}
      description="This action cannot be undone. All responses will be permanently deleted."
    >
      <div className="flex flex-col gap-4">
        {!isBulk && (
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
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={!canDelete}
            className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 disabled:bg-rose-200 disabled:border-rose-200"
          >
            {isBulk ? `Delete ${count} form${count === 1 ? '' : 's'}` : 'Delete permanently'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
