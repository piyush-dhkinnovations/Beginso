'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { savedViewSchema, type SavedViewFormValues } from '@/lib/schemas/savedView';
import type { SavedViewVisibility } from '@/types/savedView';

export interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Team visibility is offered only when permitted (OQ-8 default: Editor+). */
  canCreateTeamView: boolean;
  isSaving: boolean;
  onSave: (values: SavedViewFormValues) => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.6 (6.1). No wireframe (design.md §15):
 * `ui/Modal` — name, visibility `ui/Radio`, Save/Cancel. Captures the current filters/sort/view
 * mode is the caller's job (`ResponsesHubView` passes them into `viewsService.create` alongside
 * this form's `name`/`visibility`); this component only owns the two fields a person actually
 * types/chooses.
 */
export function SaveViewModal({ isOpen, onClose, canCreateTeamView, isSaving, onSave }: SaveViewModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SavedViewFormValues>({
    resolver: zodResolver(savedViewSchema),
    defaultValues: { name: '', visibility: 'personal' },
  });

  function handleClose() {
    reset({ name: '', visibility: 'personal' });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Save view" description="Save the current filters, sort and view as a reusable view.">
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => onSave(values))}
      >
        <Input
          id="save-view-name"
          label="Name"
          placeholder="e.g. Needs screening"
          error={errors.name?.message}
          {...register('name')}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="bg-label">Visibility</legend>
          <label className="flex items-center gap-2 bg-body-sm">
            <input type="radio" value="personal" {...register('visibility')} defaultChecked />
            Personal — only visible to you
          </label>
          {canCreateTeamView && (
            <label className="flex items-center gap-2 bg-body-sm">
              <input type="radio" value="team" {...register('visibility')} />
              Team — visible to everyone with access
            </label>
          )}
        </fieldset>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save view
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export type { SavedViewFormValues, SavedViewVisibility };
