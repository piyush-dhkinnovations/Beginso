'use client';

import type { Template } from '@/types/form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TemplateFormSheet } from '@/components/templates/TemplateFormSheet';

export interface TemplatePreviewModalProps {
  template: Template | null;
  onClose: () => void;
  onUse: (id: string) => void;
  isLoading: boolean;
}

// Read-only look at a template — its questions in order, drawn like the real form — before creating a form.
export function TemplatePreviewModal({ template, onClose, onUse, isLoading }: TemplatePreviewModalProps) {
  return (
    <Modal
      isOpen={template !== null}
      onClose={onClose}
      title={template?.name ?? ''}
      description={template?.description}
      size="lg"
    >
      {/* The questions as a respondent would see them, on a form-like sheet, scrolling inside the dialog. */}
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-(--border-default) bg-(--bg-subtle) p-3 sm:p-5">
        <div className="rounded-xl border border-(--border-default) bg-(--surface-card) p-5 shadow-(--shadow-sm) sm:p-6">
          <h3 className="bg-h5 text-(--text-primary)">{template?.name}</h3>
          <p className="mb-5 mt-1 bg-caption text-(--text-muted)">
            {template?.fields.length ?? 0} {template?.fields.length === 1 ? 'question' : 'questions'} · a preview, nothing is submitted
          </p>
          {template && <TemplateFormSheet fields={template.fields} />}
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-(--border-subtle) pt-4">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {template && (
          <Button isLoading={isLoading} onClick={() => onUse(template._id)}>Use template</Button>
        )}
      </div>
    </Modal>
  );
}
