'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceNameSchema, type WorkspaceNameFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/common/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface WorkspaceTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function WorkspaceTab({ onDirtyChange }: WorkspaceTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: settingsService.getWorkspace,
  });

  // TODO: gate the name field read-only per Requirement 5.3 once a real workspace-role contract
  // exists (see design.md §23 Risk 6) — Beginso's current data model is single-admin-per-workspace,
  // so every signed-in user is the sole owner today; there's nothing real to gate against yet.
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<WorkspaceNameFormValues>({
    resolver: zodResolver(workspaceNameSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (workspace) reset({ name: workspace.name });
  }, [workspace, reset]);

  // Same "latest ref" pattern ProfileTab uses — see its comment for why this can't depend on
  // onDirtyChange's identity directly.
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => settingsService.updateWorkspace({ name }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace() });
      reset({ name: updated.name });
      toast('Workspace updated.', 'success');
    },
    onError: () => toast('Failed to update workspace. Please try again.', 'error'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-10 bg-neutral-200 rounded w-full" />
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-body-sm text-neutral-700">Unable to load your workspace.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit((values) => updateNameMutation.mutate(values.name))} className="flex flex-col gap-4">
        <Input id="workspace-name" label="Workspace name" error={errors.name?.message} {...register('name')} />

        <Button type="submit" disabled={!isDirty} isLoading={isSubmitting || updateNameMutation.isPending} className="self-start">
          Save changes
        </Button>
      </form>

      {/* DangerZoneSection lands Thursday (task 4.1) — stub placeholder for now. */}
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="text-body-sm font-semibold text-rose-900">Danger Zone</p>
        <p className="text-caption text-rose-700 mt-1">Export or delete this workspace — coming later this sprint.</p>
      </div>
    </div>
  );
}
