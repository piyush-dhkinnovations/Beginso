'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { stageSchema, type StageFormValues } from '@/lib/schemas/stage';
import { stagesService } from '@/services/stages';
import { stageKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, type TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { STAGE_COLOR_TOKENS, CATEGORY_LABELS, type Stage, type StageCategory } from '@/types/stage';

interface StageManagerProps {
  /** Workspace slug to manage the stage pipeline for. */
  scope: string | undefined;
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Sprint 12 (inbox-collaboration), tasks.md 5.1. No wireframe — derived from `TagManager`'s
 * list+edit pattern (same file, same day-3 precedent it cites for itself). `ui/Table` with
 * up/down reorder buttons (keyboard-operable; no drag-and-drop per the task's explicit call-out).
 * Colour is a `<select>` restricted to `STAGE_COLOR_TOKENS` only — never a raw colour input —
 * matching `TagManager`'s own colour picker. Delete requires a destination stage whenever the
 * stage being removed still holds responses; the workspace's default/first stage can never be
 * deleted at all (disabled, not merely validated).
 */
export function StageManager({ scope, onDirtyChange }: StageManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  const { data: stages, isLoading, isError, refetch } = useQuery({
    queryKey: stageKeys.list(scope ?? 'none'),
    queryFn: () => stagesService.list(scope as string),
    enabled: !!scope,
  });

  const orderedStages = [...(stages ?? [])].sort((a, b) => a.order - b.order);

  const createForm = useForm<StageFormValues>({
    resolver: zodResolver(stageSchema),
    defaultValues: { name: '', colour: 'neutral', category: 'new' },
  });

  useEffect(() => {
    onDirtyChange?.(createForm.formState.isDirty);
  }, [createForm.formState.isDirty, onDirtyChange]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: stageKeys.list(scope ?? 'none') });
  }

  const createMutation = useMutation({
    mutationFn: (values: StageFormValues) => stagesService.create(scope as string, values),
    onSuccess: () => {
      createForm.reset({ name: '', colour: 'neutral', category: 'new' });
      invalidate();
      toast('Stage created.', 'success');
    },
    onError: () => toast('Failed to create stage. Please try again.', 'error'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => stagesService.update(scope as string, id, { name }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast('Stage renamed.', 'success');
    },
    onError: () => toast('Failed to rename stage. Please try again.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reassignTo: to }: { id: string; reassignTo?: string }) =>
      stagesService.remove(scope as string, id, to),
    onSuccess: () => {
      setDeleteTarget(null);
      setReassignTo('');
      invalidate();
      toast('Stage deleted.', 'success');
    },
    onError: () => toast('Failed to delete stage. Please try again.', 'error'),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => stagesService.reorder(scope as string, orderedIds),
    onSuccess: invalidate,
    onError: () => toast('Failed to reorder stages. Please try again.', 'error'),
  });

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderedStages.length) return;
    const next = [...orderedStages];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((s) => s.id));
  }

  if (!scope) {
    return (
      <EmptyState
        title="No workspace to manage stages for"
        description="You need to be an Owner or Admin of a workspace to manage its pipeline stages."
      />
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Unable to load stages"
        description="The pipeline stages could not be loaded."
        actions={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  const deleteTargetHasResponses = (deleteTarget?.responseCount ?? 0) > 0;
  const reassignChoices = orderedStages.filter((s) => s.id !== deleteTarget?.id);

  const columns: TableColumn<Stage>[] = [
    {
      key: 'order',
      header: '',
      render: (stage) => {
        const index = orderedStages.findIndex((s) => s.id === stage.id);
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Move ${stage.name} up`}
              disabled={index === 0 || reorderMutation.isPending}
              onClick={() => move(index, -1)}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              aria-label={`Move ${stage.name} down`}
              disabled={index === orderedStages.length - 1 || reorderMutation.isPending}
              onClick={() => move(index, 1)}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Stage',
      render: (stage) =>
        editingId === stage.id ? (
          <RenameRow
            stage={stage}
            isSaving={renameMutation.isPending}
            onCancel={() => setEditingId(null)}
            onSave={(name) => renameMutation.mutate({ id: stage.id, name })}
          />
        ) : (
          <span className="flex items-center gap-2">
            <Badge variant={stage.colour} dot pill>{stage.name}</Badge>
            {stage.isDefault && <span className="bg-caption text-(--text-muted)">Default</span>}
          </span>
        ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (stage) => <span className="bg-body-sm text-(--text-secondary)">{CATEGORY_LABELS[stage.category]}</span>,
    },
    {
      key: 'usage',
      header: 'Responses',
      align: 'right',
      render: (stage) => <span className="bg-body-sm text-(--text-muted)">{stage.responseCount ?? 0}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (stage) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="small" onClick={() => setEditingId(stage.id)}>Rename</Button>
          <Button
            variant="ghost"
            size="small"
            disabled={stage.isDefault}
            title={stage.isDefault ? 'The default stage cannot be deleted' : undefined}
            onClick={() => setDeleteTarget(stage)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    // 640px form column (CLAUDE.md's settings-form narrow-column allowance).
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-wrap items-start gap-3 max-w-160"
        onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
      >
        <Input
          id="new-stage-name"
          label="New stage"
          placeholder="e.g. In review"
          error={createForm.formState.errors.name?.message}
          {...createForm.register('name')}
        />
        <Select id="new-stage-colour" label="Colour" {...createForm.register('colour')}>
          {STAGE_COLOR_TOKENS.map((token) => (
            <option key={token} value={token}>{token}</option>
          ))}
        </Select>
        <Select id="new-stage-category" label="Category" {...createForm.register('category')}>
          {(Object.keys(CATEGORY_LABELS) as StageCategory[]).map((category) => (
            <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
          ))}
        </Select>
        <Button type="submit" className="mt-6.5" isLoading={createMutation.isPending}>Add stage</Button>
      </form>

      <Table
        className="bg-table-compact"
        columns={columns}
        rows={orderedStages}
        rowKey={(stage) => stage.id}
        isLoading={isLoading}
        emptyState={<p className="py-6 text-center bg-body-sm text-(--text-muted)">No stages yet. Add one above.</p>}
      />

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setReassignTo(''); }}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          deleteTargetHasResponses
            ? `This stage holds ${deleteTarget?.responseCount} response${deleteTarget?.responseCount === 1 ? '' : 's'}. Choose a stage to move them to before deleting.`
            : 'This stage is not currently used by any response.'
        }
      >
        <div className="flex flex-col gap-4">
          {deleteTargetHasResponses && (
            <Select
              id="stage-delete-reassign"
              label="Move responses to"
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
            >
              <option value="" disabled>Choose a stage…</option>
              {reassignChoices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          )}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
            <Button variant="secondary" onClick={() => { setDeleteTarget(null); setReassignTo(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              disabled={deleteTargetHasResponses && !reassignTo}
              onClick={() =>
                deleteTarget &&
                deleteMutation.mutate({ id: deleteTarget.id, reassignTo: reassignTo || undefined })
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RenameRow({
  stage,
  isSaving,
  onCancel,
  onSave,
}: {
  stage: Stage;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(stage.name);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
    >
      <div className="w-full min-w-40 max-w-72">
        <Input id={`rename-stage-${stage.id}`} aria-label="Stage name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <Button type="submit" size="small" isLoading={isSaving}>Save</Button>
      <Button type="button" variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
    </form>
  );
}
