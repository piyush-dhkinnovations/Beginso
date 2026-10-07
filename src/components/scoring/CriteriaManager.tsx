'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { criteriaSchema, type CriteriaFormValues } from '@/lib/schemas/criteria';
import { scoresService } from '@/services/scores';
import { scoreKeys } from '@/lib/queryKeys';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Table, type TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ScoreCriterion } from '@/types/score';

interface CriteriaManagerProps {
  /** Workspace slug to manage scoring criteria for. */
  scope: string | undefined;
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Sprint 12 (inbox-collaboration), tasks.md 5.2 — OQ-7 resolved 3 Oct 2026 (requirements.md
 * §B6.1). Closely mirrors `StageManager`'s structure (task 5.2's own instruction): `ui/Table`
 * with keyboard-operable up/down reorder, Owner/Admin gated, `visitedTabs`-compatible dirty
 * reporting, 640px form column. No colour/category here — a criterion is just an ordered label.
 * The workspace's first/default criterion (seeded server-side per B6.1) can never be deleted,
 * same "disabled, not merely validated" rule StageManager applies to its own default stage.
 */
export function CriteriaManager({ scope, onDirtyChange }: CriteriaManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: criteria, isLoading, isError, refetch } = useQuery({
    queryKey: scoreKeys.criteria(scope ?? 'none'),
    queryFn: () => scoresService.listCriteria(scope as string),
    enabled: !!scope,
  });

  const orderedCriteria = [...(criteria ?? [])].sort((a, b) => a.order - b.order);

  const createForm = useForm<CriteriaFormValues>({
    resolver: zodResolver(criteriaSchema),
    defaultValues: { label: '' },
  });

  useEffect(() => {
    onDirtyChange?.(createForm.formState.isDirty);
  }, [createForm.formState.isDirty, onDirtyChange]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: scoreKeys.criteria(scope ?? 'none') });
  }

  const createMutation = useMutation({
    mutationFn: (values: CriteriaFormValues) => scoresService.createCriterion(scope as string, values),
    onSuccess: (_d, values) => {
      createForm.reset({ label: '' });
      invalidate();
      toast(`Criterion "${values.label}" added.`, 'success');
    },
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'add criterion', fallback: 'Failed to add criterion. Please try again.' }), 'error'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => scoresService.updateCriterion(scope as string, id, { label }),
    onSuccess: (_d, { label }) => {
      setEditingId(null);
      invalidate();
      toast(`Criterion renamed to "${label}".`, 'success');
    },
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'rename criterion', fallback: 'Failed to rename criterion. Please try again.' }), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scoresService.removeCriterion(scope as string, id),
    onSuccess: () => {
      invalidate();
      toast('Criterion deleted.', 'success');
    },
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'delete criterion', fallback: 'Failed to delete criterion. Please try again.' }), 'error'),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => scoresService.reorderCriteria(scope as string, orderedIds),
    onSuccess: invalidate,
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'reorder criteria', fallback: 'Failed to reorder criteria. Please try again.' }), 'error'),
  });

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderedCriteria.length) return;
    const next = [...orderedCriteria];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((c) => c.id));
  }

  if (!scope) {
    return (
      <EmptyState
        title="No workspace to manage scoring criteria for"
        description="You need to be an Owner or Admin of a workspace to manage its scoring criteria."
      />
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Unable to load scoring criteria"
        description="The scoring criteria could not be loaded."
        actions={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  const columns: TableColumn<ScoreCriterion>[] = [
    {
      key: 'order',
      header: '',
      render: (criterion) => {
        const index = orderedCriteria.findIndex((c) => c.id === criterion.id);
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Move ${criterion.label} up`}
              disabled={index === 0 || reorderMutation.isPending}
              onClick={() => move(index, -1)}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              aria-label={`Move ${criterion.label} down`}
              disabled={index === orderedCriteria.length - 1 || reorderMutation.isPending}
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
      key: 'label',
      header: 'Criterion',
      render: (criterion) =>
        editingId === criterion.id ? (
          <RenameRow
            criterion={criterion}
            isSaving={renameMutation.isPending}
            onCancel={() => setEditingId(null)}
            onSave={(label) => renameMutation.mutate({ id: criterion.id, label })}
          />
        ) : (
          <span className="flex items-center gap-2">
            <span className="bg-body-sm text-(--text-primary)">{criterion.label || 'Unnamed criterion'}</span>
            {criterion.isDefault && <span className="bg-caption text-(--text-muted)">Default</span>}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (criterion) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="small" onClick={() => setEditingId(criterion.id)}>Rename</Button>
          <Button
            variant="ghost"
            size="small"
            disabled={criterion.isDefault}
            title={criterion.isDefault ? 'The default criterion cannot be deleted' : undefined}
            onClick={() => deleteMutation.mutate(criterion.id)}
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
          id="new-criterion-label"
          label="New criterion"
          placeholder="e.g. Clarity"
          error={createForm.formState.errors.label?.message}
          {...createForm.register('label')}
        />
        <Button type="submit" className="mt-6.5" isLoading={createMutation.isPending}>Add criterion</Button>
      </form>

      <Table
        className="bg-table-compact"
        columns={columns}
        rows={orderedCriteria}
        rowKey={(criterion) => criterion.id}
        isLoading={isLoading}
        emptyState={<p className="py-6 text-center bg-body-sm text-(--text-muted)">No criteria yet. Add one above.</p>}
      />
    </div>
  );
}

function RenameRow({
  criterion,
  isSaving,
  onCancel,
  onSave,
}: {
  criterion: ScoreCriterion;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (label: string) => void;
}) {
  const [label, setLabel] = useState(criterion.label);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim()) onSave(label.trim());
      }}
    >
      <div className="w-full min-w-40 max-w-72">
        <Input id={`rename-criterion-${criterion.id}`} aria-label="Criterion label" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </div>
      <Button type="submit" size="small" isLoading={isSaving}>Save</Button>
      <Button type="button" variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
    </form>
  );
}
