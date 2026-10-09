import { useState, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { trashService } from '@/services/trash';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useToast } from '@/components/ui/Toast';
import type { Form } from '@/types/form';
import type { FormsContext } from '@/types/workspace';

interface Args {
  context: FormsContext;
  data: { forms: Form[] } | undefined;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  setBulkDeleteConfirming: Dispatch<SetStateAction<boolean>>;
}

export function useFormsMutations({ context, data, page, setPage, setSelectedIds, setBulkDeleteConfirming }: Args) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => formsService.duplicateForm(id),
    onMutate: (id) => setDuplicatingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast('Form duplicated successfully', 'success');
    },
    onError: () => {
      toast('Failed to duplicate form. Please try again.', 'error');
    },
    onSettled: () => setDuplicatingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsService.deleteForm(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      if (data?.forms.length === 1 && page > 1) setPage((current) => current - 1);
      // Delete means Trash since Sprint 13 (CF5.5): reversible, so name the form and offer Undo.
      const title = data?.forms.find((f) => f._id === id)?.title ?? 'Form';
      const scope = context.type === 'workspace' ? context.workspaceId : 'personal';
      toast(`"${title}" moved to Trash`, 'success', undefined, {
        label: 'Undo',
        onClick: () => {
          trashService
            .restore(scope, 'form', id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              queryClient.invalidateQueries({ queryKey: ['trash'] });
              toast(`"${title}" restored`, 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err, { action: `restore "${title}"` }), 'error'));
        },
      });
    },
    onError: (err) => {
      toast(getFriendlyErrorMessage(err, { action: 'delete this form' }), 'error');
    },
    onSettled: () => setDeletingId(null),
  });

  // Archive / Unarchive (Sprint 13, CF5.6). Archive keeps the form and its responses indefinitely and takes it
  // out of the active list; the same call serves the row action and the bulk bar (sequential, like delete).
  const archiveMutation = useMutation({
    mutationFn: async ({ ids, archive }: { ids: string[]; archive: boolean }) => {
      for (const id of ids) {
        await (archive ? formsService.archiveForm(id) : formsService.unarchiveForm(id));
      }
    },
    onMutate: ({ ids }) => setArchivingId(ids.length === 1 ? ids[0] : '*'),
    onSuccess: (_d, { ids, archive }) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setSelectedIds(new Set());
      const n = ids.length;
      toast(`${n} form${n === 1 ? '' : 's'} ${archive ? 'archived' : 'unarchived'}`, 'success', undefined, {
        label: 'Undo',
        onClick: () => archiveMutation.mutate({ ids, archive: !archive }),
      });
    },
    onError: (err, { archive }) => toast(getFriendlyErrorMessage(err, { action: archive ? 'archive this form' : 'unarchive this form', fallback: 'Could not update the form. Please try again.' }), 'error'),
    onSettled: () => setArchivingId(null),
  });

  const bulkDeleteMutation = useMutation({
    // Sequential per-id calls, not Promise.all — task 6.4's own stated reasoning: acceptable at
    // this sprint's expected list sizes, no batching infrastructure to build speculatively.
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await formsService.deleteForm(id);
      }
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setSelectedIds(new Set());
      const scope = context.type === 'workspace' ? context.workspaceId : 'personal';
      toast(`${ids.length} form${ids.length === 1 ? '' : 's'} moved to Trash`, 'success', undefined, {
        label: 'Undo',
        onClick: () => {
          Promise.all(ids.map((id) => trashService.restore(scope, 'form', id)))
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              queryClient.invalidateQueries({ queryKey: ['trash'] });
              toast(`${ids.length} form${ids.length === 1 ? '' : 's'} restored`, 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err, { action: 'restore these forms' }), 'error'));
        },
      });
    },
    onError: (err) => {
      toast(getFriendlyErrorMessage(err, { action: 'delete the selected forms' }), 'error');
    },
    onSettled: () => setBulkDeleteConfirming(false),
  });

  return { duplicatingId, deletingId, archivingId, duplicateMutation, deleteMutation, archiveMutation, bulkDeleteMutation };
}
