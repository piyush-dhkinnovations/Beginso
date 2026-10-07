'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { workspaceNameSchema, type WorkspaceNameFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DangerZoneSection } from './DangerZoneSection';

interface WorkspaceTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
  /** Workspace slug when rendered inside /w/[slug]/settings. Also hides the account-level Danger Zone. */
  scope?: string;
}

export function WorkspaceTab({ onDirtyChange, scope }: WorkspaceTabProps) {
  const { toast } = useToast();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading, isError, error, refetch } = useQuery({
    queryKey: settingsKeys.workspace(scope),
    queryFn: () => settingsService.getWorkspace(scope),
  });

  // Confirmed live 18 Aug 2026 (backend commit a7a5185) — DELETE /api/workspaces/current now
  // deletes the calling User record and Firebase Auth user too, so this branch should no longer
  // be reachable for any deletion going forward. Kept as defense-in-depth for accounts orphaned
  // before that fix shipped: a 404 here means "this account has no workspace," not a transient
  // failure a "Try again" retry could ever fix, so it's signed out with a real explanation instead
  // of stuck on a retry loop that can only ever fail the same way again.
  const isOrphanedAccount = isAxiosError(error) && error.response?.status === 404;

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
    mutationFn: (name: string) => settingsService.updateWorkspace({ name }, scope),
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
        <div className="h-10 bg-(--border-default) rounded w-full" />
      </div>
    );
  }

  if (isOrphanedAccount) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">
          This account no longer has an active workspace, so there&apos;s nothing to manage here.
          You&apos;ll need to sign out and create a new account to continue.
        </p>
        <Button variant="secondary" size="small" className="self-start" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">Unable to load your workspace.</p>
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

      {/* Export/delete act on the signed-in account (DELETE /workspaces/current deletes the user
          too), so they live in account settings' Data tab, not per-workspace settings. */}
      {!scope && <DangerZoneSection workspaceName={workspace.name} />}
    </div>
  );
}
