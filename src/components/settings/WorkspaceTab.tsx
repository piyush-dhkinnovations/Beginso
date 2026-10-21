'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { workspaceGeneralSchema, type WorkspaceGeneralFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { workspacesService } from '@/services/workspaces';
import { settingsKeys, workspaceKeys } from '@/lib/queryKeys';
import type { WorkspaceListItem } from '@/types/workspace';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { LogoChoice } from '@/components/flow/LogoChoice';
import { StickySaveBar, useSavedFlash } from './StickySaveBar';
import { DangerZoneSection } from './DangerZoneSection';
import { TimezoneSelect } from './TimezoneSelect';

interface WorkspaceTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
  /** Workspace slug when rendered inside /w/[slug]/settings. Also hides the account-level Danger Zone. */
  scope?: string;
  /** Called after a per-workspace delete succeeds (caller owns the redirect). */
  onDeleted?: () => void;
}

export function WorkspaceTab({ onDirtyChange, scope, onDeleted }: WorkspaceTabProps) {
  const { toast } = useToast();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [logo, setLogo] = useState<string | null>(null);
  // Tracks the logo value last loaded from (or saved to) the server so we know when the user
  // changed it without touching a form field (StickySaveBar hides when only RHF isDirty).
  const [savedLogo, setSavedLogo] = useState<string | null>(null);
  const logoDirty = logo !== savedLogo;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typedName, setTypedName] = useState('');

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
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<WorkspaceGeneralFormValues>({
    resolver: zodResolver(workspaceGeneralSchema),
    defaultValues: { name: '', description: '', timezone: 'UTC' },
  });

  useEffect(() => {
    if (workspace) {
      reset({ name: workspace.name, description: workspace.description ?? '', timezone: workspace.timezone ?? 'UTC' });
      const serverLogo = workspace.logoUrl ?? null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedLogo(serverLogo);
      setLogo(serverLogo);
    }
  }, [workspace, reset]);

  // Same "latest ref" pattern ProfileTab uses — see its comment for why this can't depend on
  // onDirtyChange's identity directly.
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty || logoDirty);
  }, [isDirty, logoDirty]);

  const [saved, flashSaved] = useSavedFlash();
  const updateMutation = useMutation({
    mutationFn: (values: WorkspaceGeneralFormValues) =>
      settingsService.updateWorkspace(
        { name: values.name, description: values.description.trim(), timezone: values.timezone, logoUrl: logo },
        scope
      ),
    onSuccess: (updated, values) => {
      // Immediately reflect the saved logo — don't wait for the workspace query to refetch.
      const newLogo = updated.logoUrl ?? null;
      setSavedLogo(newLogo);
      setLogo(newLogo);
      // Patch the sidebar's list cache directly so the logo appears there without a full refetch.
      if (scope) {
        queryClient.setQueriesData<WorkspaceListItem[]>(
          { queryKey: workspaceKeys.list() },
          (old) => old?.map((w) => (w.slug === scope ? { ...w, logo: newLogo } : w))
        );
      }
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      // Show what the server actually stored. Falling back to the typed values hid a backend that dropped them.
      reset({ name: updated.name ?? values.name, description: updated.description ?? '', timezone: updated.timezone ?? 'UTC' });
      flashSaved();
      toast('Workspace settings saved.', 'success');
    },
    onError: (error) =>
      toast(getFriendlyErrorMessage(error, { action: 'change workspace settings', fallback: 'Workspace settings were not saved. Please try again.' }), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspacesService.delete(scope as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      onDeleted?.();
    },
    onError: (error) =>
      toast(getFriendlyErrorMessage(error, { action: 'delete workspace', fallback: 'Could not delete workspace. Please try again.' }), 'error'),
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
      <form onSubmit={handleSubmit((values) => updateMutation.mutate(values))} className="flex flex-col gap-4">
        <Input id="workspace-name" label="Workspace name" error={errors.name?.message} {...register('name')} />
        <Textarea
          id="workspace-description"
          label="Description"
          rows={3}
          maxLength={500}
          placeholder="What this workspace is for (shown to members)"
          error={errors.description?.message}
          {...register('description')}
        />
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <TimezoneSelect
              id="workspace-timezone"
              label="Timezone"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.timezone?.message}
            />
          )}
        />
        <p className="-mt-2 bg-caption text-(--text-muted)">Dates in digests, exports and activity use this timezone.</p>

        <LogoChoice subject="workspace" value={logo} onChange={setLogo} />

        <StickySaveBar
          dirty={isDirty || logoDirty}
          saving={isSubmitting || updateMutation.isPending}
          saved={saved}
          subject="Workspace settings"
          onDiscard={() => { reset(); setLogo(savedLogo); }}
        />
      </form>

      {/* Account-level export/delete (deletes the user account too) — personal settings only. */}
      {!scope && <DangerZoneSection workspaceName={workspace.name} />}

      {/* Per-workspace delete — only in /w/:slug/settings, not in personal account settings. */}
      {scope && (
        <div className="flex flex-col gap-3 rounded-lg border border-(--error-border) bg-(--error-surface) p-4">
          <div>
            <p className="bg-body-sm font-semibold text-(--error-text)">Danger Zone</p>
            <p className="bg-caption text-(--error-text) mt-1">
              Permanently delete this workspace, all its forms, responses and files. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" size="small" className="self-start" onClick={() => { setTypedName(''); setDeleteOpen(true); }}>
            Delete workspace
          </Button>
        </div>
      )}

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete "${workspace.name}"?`}
      >
        <div className="flex flex-col gap-4 pt-2">
          <div role="alert" className="rounded-md border border-(--error-border) bg-(--error-surface) p-3 bg-body-sm text-(--error-text)">
            <p className="font-semibold">This cannot be undone.</p>
            <p className="mt-1">All forms, responses and files in this workspace will be permanently deleted.</p>
          </div>
          <div>
            <label htmlFor="delete-ws-name-input" className="block bg-body-sm text-(--text-secondary) mb-1.5">
              Type <span className="font-semibold text-(--text-primary)">{workspace.name}</span> to confirm
            </label>
            <input
              id="delete-ws-name-input"
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={workspace.name}
              disabled={deleteMutation.isPending}
              autoComplete="off"
              className="w-full bg-(--bg-page) text-(--text-primary) border border-(--border-strong) rounded-md px-3 py-2 bg-body focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--border-default) transition-colors"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-subtle)">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              disabled={typedName !== workspace.name}
              onClick={() => void deleteMutation.mutateAsync().then(() => setDeleteOpen(false))}
            >
              Delete workspace permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
