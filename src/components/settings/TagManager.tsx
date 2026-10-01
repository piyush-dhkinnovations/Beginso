'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tagSchema, type TagFormValues } from '@/lib/schemas/tag';
import { tagsService } from '@/services/tags';
import { tagKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { STAGE_COLOR_TOKENS } from '@/types/stage';
import type { Tag } from '@/types/tag';

interface TagManagerProps {
  /** Workspace slug to manage the tag library for. */
  scope: string | undefined;
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.7, design.md §15 (task 2.5): "No wireframe
 * — derived from RolesMatrix's list+edit pattern." Owner/Admin only (the caller gates the tab
 * itself; a canManageTags(role) check is still applied here as the same convenience-not-gate
 * every other settings surface carries). Inline create per OQ-5's default (any `responses:act`
 * role may create) — but that create control lives in `TagPicker` (the in-context picker), not
 * here: this screen is the library manager (rename/recolour/merge/delete), Owner/Admin only.
 */
export function TagManager({ scope, onDirtyChange }: TagManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Tag | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState('');

  const { data: tags, isLoading, isError, refetch } = useQuery({
    queryKey: tagKeys.list(scope ?? 'none'),
    queryFn: () => tagsService.list(scope as string),
    enabled: !!scope,
  });

  const createForm = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '', colour: 'neutral' },
  });

  // Requirements.md §12.1 (CLAUDE.md's mandatory settings-tab pattern): an unsaved edit must
  // survive a tab switch — this tab reports dirty state up the same way every other Settings tab
  // does (ProfileTab/WorkspaceTab precedent), so SettingsPage's `visitedTabs`/confirm-before-leave
  // flow covers it without this component needing its own persistence.
  useEffect(() => {
    onDirtyChange?.(createForm.formState.isDirty);
  }, [createForm.formState.isDirty, onDirtyChange]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: tagKeys.list(scope ?? 'none') });
  }

  const createMutation = useMutation({
    mutationFn: (values: TagFormValues) => tagsService.create(scope as string, values),
    onSuccess: () => {
      createForm.reset({ name: '', colour: 'neutral' });
      invalidate();
      toast('Tag created.', 'success');
    },
    onError: () => toast('Failed to create tag. Please try again.', 'error'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsService.update(scope as string, id, { name }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast('Tag renamed.', 'success');
    },
    onError: () => toast('Failed to rename tag. Please try again.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsService.remove(scope as string, id),
    onSuccess: () => {
      setDeleteTarget(null);
      invalidate();
      toast('Tag deleted.', 'success');
    },
    onError: () => toast('Failed to delete tag. Please try again.', 'error'),
  });

  const mergeMutation = useMutation({
    mutationFn: ({ id, into }: { id: string; into: string }) => tagsService.merge(scope as string, id, into),
    onSuccess: () => {
      setMergeTarget(null);
      setMergeIntoId('');
      invalidate();
      toast('Tags merged.', 'success');
    },
    onError: () => toast('Failed to merge tags. Please try again.', 'error'),
  });

  if (!scope) {
    return (
      <EmptyState
        title="No workspace to manage tags for"
        description="You need to be an Owner or Admin of a workspace to manage its tag library."
      />
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Unable to load tags"
        description="The tag library could not be loaded."
        actions={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  return (
    // 640px form column (CLAUDE.md/design.md §15 — the narrow-column exception for settings forms).
    <div className="flex flex-col gap-6 max-w-160">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
      >
        <Input
          id="new-tag-name"
          label="New tag"
          placeholder="e.g. Hot lead"
          error={createForm.formState.errors.name?.message}
          {...createForm.register('name')}
        />
        <Select id="new-tag-colour" label="Colour" {...createForm.register('colour')}>
          {STAGE_COLOR_TOKENS.map((token) => (
            <option key={token} value={token}>{token}</option>
          ))}
        </Select>
        <Button type="submit" isLoading={createMutation.isPending}>Add tag</Button>
      </form>

      {isLoading ? (
        <p className="bg-body-sm text-(--text-muted)">Loading tags…</p>
      ) : !tags || tags.length === 0 ? (
        <p className="bg-body-sm text-(--text-muted)">No tags yet. Add one above.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-3 py-2 border-b border-(--border-subtle)">
              {editingId === tag.id ? (
                <RenameRow
                  tag={tag}
                  isSaving={renameMutation.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(name) => renameMutation.mutate({ id: tag.id, name })}
                />
              ) : (
                <>
                  <Badge variant={tag.colour} dot pill>{tag.name}</Badge>
                  <span className="bg-caption text-(--text-muted)">
                    {tag.usageCount ?? 0} response{(tag.usageCount ?? 0) === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="small" onClick={() => setEditingId(tag.id)}>Rename</Button>
                    <Button variant="ghost" size="small" onClick={() => setMergeTarget(tag)}>Merge</Button>
                    <Button variant="ghost" size="small" onClick={() => setDeleteTarget(tag)}>Delete</Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          deleteTarget && (deleteTarget.usageCount ?? 0) > 0
            ? `This tag is used by ${deleteTarget.usageCount} response${deleteTarget.usageCount === 1 ? '' : 's'}. It will be removed from all of them.`
            : 'This tag is not currently used by any response.'
        }
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={mergeTarget !== null}
        onClose={() => { setMergeTarget(null); setMergeIntoId(''); }}
        title={`Merge "${mergeTarget?.name}" into…`}
        description="Every response tagged with this tag will be re-tagged with the target instead. This cannot be undone."
      >
        <div className="flex flex-col gap-4">
          <Select
            id="merge-into"
            label="Merge into"
            value={mergeIntoId}
            onChange={(e) => setMergeIntoId(e.target.value)}
          >
            <option value="" disabled>Choose a tag…</option>
            {(tags ?? []).filter((t) => t.id !== mergeTarget?.id).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
            <Button variant="secondary" onClick={() => { setMergeTarget(null); setMergeIntoId(''); }}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!mergeIntoId}
              isLoading={mergeMutation.isPending}
              onClick={() => mergeTarget && mergeIntoId && mergeMutation.mutate({ id: mergeTarget.id, into: mergeIntoId })}
            >
              Merge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RenameRow({
  tag,
  isSaving,
  onCancel,
  onSave,
}: {
  tag: Tag;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(tag.name);
  return (
    <form
      className="flex items-center gap-2 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
    >
      <Input id={`rename-${tag.id}`} aria-label="Tag name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <Button type="submit" size="small" isLoading={isSaving}>Save</Button>
      <Button type="button" variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
    </form>
  );
}
