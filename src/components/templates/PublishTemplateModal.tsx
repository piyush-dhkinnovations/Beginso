'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { templatesService } from '@/services/templates';
import { templateKeys } from '@/lib/queryKeys';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

// Sprint 13 (B6.4). "Publish to templates": a SNAPSHOT of a form for the whole workspace to start from —
// fields, logic, pages, settings and theme. It never copies responses, notes, assignees, tags, the share link
// or analytics, and it is not linked to the source form afterwards. Editor and above (the server enforces it).
export interface PublishTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Workspace slug. Templates belong to a workspace, so personal forms cannot be published. */
  scope: string;
  formId: string;
  formTitle: string;
}

export function PublishTemplateModal({ isOpen, onClose, scope, formId, formTitle }: PublishTemplateModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish to templates"
      description="Your team will be able to start new forms from this one. Responses are never copied."
    >
      {isOpen && <Body onClose={onClose} scope={scope} formId={formId} formTitle={formTitle} />}
    </Modal>
  );
}

function Body({ onClose, scope, formId, formTitle }: Omit<PublishTemplateModalProps, 'isOpen'>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(formTitle);

  const publish = useMutation({
    mutationFn: () => templatesService.publishAsTemplate(scope, { formId, name: name.trim() || formTitle }),
    onSuccess: (template) => {
      toast(`"${template.name}" is now a workspace template`, 'success');
      void queryClient.invalidateQueries({ queryKey: templateKeys.all(scope) });
      onClose();
    },
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!publish.isPending) publish.mutate();
      }}
    >
      <Input id="template-name" label="Template name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-subtle)">
        <Button type="button" variant="secondary" onClick={onClose} disabled={publish.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={publish.isPending}>
          Publish template
        </Button>
      </div>
    </form>
  );
}
