import { PublishTemplateModal } from '@/components/templates/PublishTemplateModal';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { MoveFormModal } from '@/components/workspaces/MoveFormModal';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import type { FormsPageState } from '@/hooks/useFormsPage';
import type { FormsContext } from '@/types/workspace';

export function FormsDialogs({ s, context }: { s: FormsPageState; context: FormsContext }) {
  const { formToMove, formToShare, formToDelete, formToTemplate } = s;
  return (
    <>
      <MoveFormModal
        isOpen={formToMove !== null}
        formId={formToMove?._id ?? ''}
        formTitle={formToMove?.title ?? ''}
        currentContext={context}
        onClose={() => s.setFormToMove(null)}
      />

      {/* requirements.md §7.8 — works identically on a personal or workspace form; this same
          FormsPage/FormRow is already shared between (user)/forms and /w/[slug]/forms (Sprint 8),
          so no per-context branching is needed here (design.md §4). */}
      <FormAccessPanel
        isOpen={formToShare !== null}
        formId={formToShare?._id ?? ''}
        formTitle={formToShare?.title ?? ''}
        onClose={() => s.setFormToShare(null)}
      />

      <DeleteFormModal
        isOpen={formToDelete !== null}
        formTitle={formToDelete?.title ?? ''}
        responseCount={formToDelete?.responseCount}
        onClose={() => s.setFormToDelete(null)}
        onConfirm={() => {
          if (formToDelete) {
            s.deleteMutation.mutate(formToDelete._id);
            s.setFormToDelete(null);
          }
        }}
        isDeleting={s.deletingId !== null}
      />

      <PublishTemplateModal
        isOpen={formToTemplate !== null}
        onClose={() => s.setFormToTemplate(null)}
        scope={context.type === 'workspace' ? context.workspaceId : ''}
        formId={formToTemplate?._id ?? ''}
        formTitle={formToTemplate?.title ?? ''}
      />

      <DeleteFormModal
        isOpen={s.bulkDeleteConfirming}
        count={s.selectedIds.size}
        onClose={() => s.setBulkDeleteConfirming(false)}
        onConfirm={() => s.bulkDeleteMutation.mutate([...s.selectedIds])}
        isDeleting={s.bulkDeleteMutation.isPending}
      />
    </>
  );
}
