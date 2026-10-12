'use client';

import { useState } from 'react';
import { FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/Toast';
import { LogoChoice } from '@/components/flow/LogoChoice';

interface FormLogoButtonProps {
  /** The form's current logo, or null/undefined for the BeginSo default tile. */
  logoUrl?: string | null;
  /** Saves the new logo (null = back to the default). Rejects on failure. */
  onSave: (logoUrl: string | null) => Promise<unknown> | void;
  /** Without edit rights the logo is shown but cannot be changed (the server enforces this too). */
  canEdit?: boolean;
}

/**
 * The form's icon in its page header. With edit rights it carries a small pencil; clicking opens the same
 * "BeginSo default / Upload your logo" choice as the Create form page.
 */
export function FormLogoButton({ logoUrl, onSave, canEdit = true }: FormLogoButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(logoUrl ?? null);
  const [saving, setSaving] = useState(false);

  const tile = (
    <span className="inline-flex size-12 flex-none items-center justify-center overflow-hidden rounded-2xl bg-(--accent-soft) text-(--action-primary) sm:size-13 [&_svg]:size-6">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <FileText aria-hidden="true" />
      )}
    </span>
  );

  if (!canEdit) return tile;

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setOpen(false);
    } catch {
      toast('Could not save the logo. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Tooltip content="Change logo">
        <button
          type="button"
          onClick={() => {
            setDraft(logoUrl ?? null);
            setOpen(true);
          }}
          aria-label="Change form logo"
          className="group relative flex-none rounded-2xl outline-none focus-visible:shadow-(--shadow-focus)"
        >
          {tile}
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-card) text-(--text-secondary) shadow-(--shadow-sm) transition-transform group-hover:scale-110">
            <Pencil size={12} aria-hidden="true" />
          </span>
        </button>
      </Tooltip>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Change form logo" description="Pick the logo shown on this form.">
        <div className="flex flex-col gap-5">
          <LogoChoice subject="form" value={draft} onChange={setDraft} disabled={saving} />
          <div className="flex items-center justify-end gap-3 border-t border-(--border-default) pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} isLoading={saving} disabled={draft === (logoUrl ?? null)}>
              Save logo
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
