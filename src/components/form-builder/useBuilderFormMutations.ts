import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { trashService } from '@/services/trash';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import type { Form } from '@/types/form';

// Close-form and delete-form flows (modal visibility + mutations).
export function useBuilderFormMutations({
  formWorkspaceSlug,
  formsListHref,
}: {
  formWorkspaceSlug: string | undefined;
  formsListHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const setStatus = useBuilderStore((state) => state.setStatus);

  // ─── Close form flow ──────────────────────────────────────────────────────────

  const closeMutation = useMutation({
    mutationFn: () => formsService.closeForm(formId!),
    onSuccess: () => {
      setStatus('closed');
      queryClient.setQueryData<Form>(['form', formId], (oldData) =>
        oldData ? { ...oldData, status: 'closed' } : oldData
      );
      setShowCloseModal(false);
      toast('Form closed. It will no longer accept new responses.', 'success');
    },
    onError: () => {
      toast('Failed to close form. Please try again.', 'error');
    },
  });

  // ─── Delete form flow ─────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => formsService.deleteForm(formId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      // Delete means Trash since Sprint 13 (CF5.5): reversible for 30 days.
      const id = formId!;
      const scope = formWorkspaceSlug ?? 'personal';
      toast(`"${formTitle}" moved to Trash`, 'success', undefined, {
        label: 'Undo',
        onClick: () => {
          trashService
            .restore(scope, 'form', id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              queryClient.invalidateQueries({ queryKey: ['trash'] });
              toast(`"${formTitle}" restored`, 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err, { action: `restore "${formTitle}"` }), 'error'));
        },
      });
      router.push(formsListHref);
    },
    onError: (err) => {
      toast(getFriendlyErrorMessage(err, { action: 'delete this form' }), 'error');
    },
  });

  return { showCloseModal, setShowCloseModal, showDeleteModal, setShowDeleteModal, closeMutation, deleteMutation };
}
