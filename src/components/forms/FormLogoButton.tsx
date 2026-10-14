'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { FormMarkPicker } from '@/components/forms/FormMarkPicker';
import { FormTile } from '@/components/forms/FormTile';
import type { FormMark } from '@/types/form';

interface FormLogoButtonProps {
  /** The form's current mark: an uploaded logo, an icon, or none (picked automatically from the name). */
  mark: FormMark;
  /** The form's name, for the automatic icon. */
  title: string;
  /** Saves the new mark. Rejects on failure. */
  onSave: (mark: FormMark) => Promise<unknown> | void;
  /** Without edit rights the mark is shown but cannot be changed (the server enforces this too). */
  canEdit?: boolean;
}

const same = (a: FormMark, b: FormMark) => (a.logoUrl ?? null) === (b.logoUrl ?? null) && (a.iconName ?? null) === (b.iconName ?? null);

/**
 * The form's icon in its page header. With edit rights it carries a small pencil; clicking opens the same
 * icon grid (with the upload tile) as the Create form page.
 */
export function FormLogoButton({ mark, title, onSave, canEdit = true }: FormLogoButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FormMark>(mark);
  const [saving, setSaving] = useState(false);

  const tile = <FormTile title={title} size={52} logoUrl={mark.logoUrl} iconName={mark.iconName} />;

  if (!canEdit) return tile;

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setOpen(false);
    } catch {
      toast('Could not save the icon. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(mark);
          setOpen(true);
        }}
        aria-label="Change form icon"
        title="Change icon"
        className="group relative flex-none rounded-2xl outline-none focus-visible:shadow-(--shadow-focus)"
      >
        {tile}
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-card) text-(--text-secondary) shadow-(--shadow-sm) transition-colors group-hover:border-(--action-primary) group-hover:text-(--action-primary)">
          <Pencil size={10} aria-hidden="true" />
        </span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Change form icon" description="Pick the icon shown for this form.">
        <div className="flex flex-col gap-5">
          <FormMarkPicker value={draft} onChange={setDraft} title={title} disabled={saving} />
          <div className="flex items-center justify-end gap-3 border-t border-(--border-default) pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} isLoading={saving} disabled={same(draft, mark)}>
              Save icon
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
