'use client';

import type { Template } from '@/types/form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

export interface TemplatePreviewModalProps {
  template: Template | null;
  onClose: () => void;
  onUse: (id: string) => void;
  isLoading: boolean;
}

const humanize = (type: string) => type.replace(/_/g, ' ');

// Read-only look at what a template contains — its questions in order — before creating a form.
export function TemplatePreviewModal({ template, onClose, onUse, isLoading }: TemplatePreviewModalProps) {
  return (
    <Modal
      isOpen={template !== null}
      onClose={onClose}
      title={template?.name ?? ''}
      description={template?.description}
      size="lg"
    >
      <ol className="flex max-h-96 flex-col divide-y divide-(--border-subtle) overflow-y-auto">
        {template?.fields.map((field, index) => (
          <li key={index} className="flex items-center justify-between gap-3 py-2.5">
            <span className="bg-body-sm text-(--text-primary)">
              <span className="mr-2 text-(--text-disabled)">{index + 1}.</span>
              {field.label}
              {field.required && <span className="ml-1 text-(--error-text)" aria-label="required">*</span>}
            </span>
            <Tag className="capitalize">{humanize(field.type)}</Tag>
          </li>
        ))}
      </ol>
      <div className="flex justify-end gap-3 border-t border-(--border-subtle) pt-4">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {template && (
          <Button isLoading={isLoading} onClick={() => onUse(template._id)}>Use template</Button>
        )}
      </div>
    </Modal>
  );
}
