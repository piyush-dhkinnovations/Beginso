'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface DeleteFormModalProps {
  isOpen: boolean;
  /** Single mode: the form's title, named in the sentence. */
  formTitle?: string;
  /** Single mode: real response count when known, so the sentence says what moves. */
  responseCount?: number;
  /** Bulk mode: pass a count instead of a title. */
  count?: number;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

// Moving to Trash is reversible (30 days, plus an Undo toast at the call site), so: one sentence, one
// button, no type-to-confirm. Type-to-confirm is kept for irreversible actions only (EmptyTrashModal,
// DeleteWorkspaceModal).
export function DeleteFormModal({ isOpen, formTitle, responseCount, count, onClose, onConfirm, isDeleting }: DeleteFormModalProps) {
  // Bulk mode is selected by which prop the caller passes, not by count's magnitude.
  const isBulk = typeof count === 'number';
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const sentence = isBulk
    ? `${plural(count, 'form')} and their responses move to Trash. You can restore them for 30 days.`
    : typeof responseCount === 'number'
      ? `${formTitle} and its ${plural(responseCount, 'response')} move to Trash. You can restore them for 30 days.`
      : `${formTitle} and its responses move to Trash. You can restore them for 30 days.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBulk ? `Move ${plural(count, 'form')} to Trash?` : 'Move form to Trash?'}
      description={sentence}
    >
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-subtle)">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} isLoading={isDeleting}>
          {isBulk ? `Move ${plural(count, 'form')} to Trash` : 'Move to Trash'}
        </Button>
      </div>
    </Modal>
  );
}
