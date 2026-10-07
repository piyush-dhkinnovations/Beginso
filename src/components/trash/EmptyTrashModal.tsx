'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Sprint 13 (CF5.5), wireframe 42 "Empty Trash (confirm)". Type-to-confirm is reserved for genuinely
// unrecoverable actions — everything reversible uses an undo toast instead. The literal is checked here for
// convenience AND by the server, which refuses a delete without `confirm: "DELETE"`.
export interface EmptyTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  title?: string;
  /** What is about to be destroyed, with real counts where known — shown in the red panel. */
  detail?: string;
  confirmLabel?: string;
}

export function EmptyTrashModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  title = 'Permanently delete',
  detail = 'Forms, their responses, uploaded files and analytics history will be destroyed immediately.',
  confirmLabel = 'Delete permanently',
}: EmptyTrashModalProps) {
  // Re-key on open so a previous attempt's text never carries over.
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isOpen && <Body onClose={onClose} onConfirm={onConfirm} isPending={isPending} detail={detail} confirmLabel={confirmLabel} />}
    </Modal>
  );
}

function Body({
  onClose,
  onConfirm,
  isPending,
  detail,
  confirmLabel,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  detail: string;
  confirmLabel: string;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed === 'DELETE';

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (matches && !isPending) onConfirm();
      }}
    >
      <div className="flex items-start gap-2 rounded-md border border-(--error-border) bg-(--error-surface) p-3 text-(--error-text)">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="bg-body-sm">
          <strong>This cannot be undone.</strong> {detail}
        </p>
      </div>
      <Input
        id="confirm-delete"
        label="Type DELETE to confirm"
        placeholder="DELETE"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        aria-describedby="confirm-delete-hint"
      />
      <p id="confirm-delete-hint" className="sr-only">
        The delete button stays disabled until you type DELETE in capital letters.
      </p>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-subtle)">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={!matches} isLoading={isPending}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
