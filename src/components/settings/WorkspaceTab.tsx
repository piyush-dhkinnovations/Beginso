'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { workspaceGeneralSchema, type WorkspaceGeneralFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { StickySaveBar, useSavedFlash } from './StickySaveBar';
import { DangerZoneSection } from './DangerZoneSection';

// The main zones people actually pick, as IANA ids with a readable label. The field is type-to-search; any
// other valid IANA zone can still be typed in (the schema checks it).
const MAIN_TIMEZONES: { id: string; label: string }[] = [
  { id: 'UTC', label: 'UTC' },
  { id: 'Asia/Kolkata', label: 'India (Kolkata)' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { id: 'Asia/Shanghai', label: 'China (Shanghai)' },
  { id: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { id: 'Asia/Seoul', label: 'Seoul' },
  { id: 'Asia/Karachi', label: 'Pakistan (Karachi)' },
  { id: 'Asia/Dhaka', label: 'Dhaka' },
  { id: 'Asia/Jakarta', label: 'Jakarta' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'Pacific/Auckland', label: 'Auckland' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Dublin', label: 'Dublin' },
  { id: 'Europe/Paris', label: 'Paris' },
  { id: 'Europe/Berlin', label: 'Berlin' },
  { id: 'Europe/Madrid', label: 'Madrid' },
  { id: 'Europe/Rome', label: 'Rome' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam' },
  { id: 'Europe/Istanbul', label: 'Istanbul' },
  { id: 'Europe/Moscow', label: 'Moscow' },
  { id: 'Africa/Cairo', label: 'Cairo' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg' },
  { id: 'Africa/Lagos', label: 'Lagos' },
  { id: 'Africa/Nairobi', label: 'Nairobi' },
  { id: 'America/New_York', label: 'New York (Eastern)' },
  { id: 'America/Chicago', label: 'Chicago (Central)' },
  { id: 'America/Denver', label: 'Denver (Mountain)' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (Pacific)' },
  { id: 'America/Toronto', label: 'Toronto' },
  { id: 'America/Mexico_City', label: 'Mexico City' },
  { id: 'America/Sao_Paulo', label: 'Sao Paulo' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
];

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
  } = useForm<WorkspaceGeneralFormValues>({
    resolver: zodResolver(workspaceGeneralSchema),
    defaultValues: { name: '', description: '', timezone: 'UTC' },
  });

  useEffect(() => {
    if (workspace) reset({ name: workspace.name, description: workspace.description ?? '', timezone: workspace.timezone ?? 'UTC' });
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

  const [saved, flashSaved] = useSavedFlash();
  const updateMutation = useMutation({
    mutationFn: (values: WorkspaceGeneralFormValues) =>
      settingsService.updateWorkspace(
        { name: values.name, description: values.description.trim(), timezone: values.timezone },
        scope
      ),
    onSuccess: (updated, values) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace() });
      reset({ name: updated.name ?? values.name, description: updated.description ?? values.description, timezone: updated.timezone ?? values.timezone });
      flashSaved();
      toast('Workspace settings saved.', 'success');
    },
    onError: (error) =>
      toast(getFriendlyErrorMessage(error, { action: 'change workspace settings', fallback: 'Workspace settings were not saved. Please try again.' }), 'error'),
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
        <Input
          id="workspace-timezone"
          label="Timezone"
          list="workspace-timezone-options"
          autoComplete="off"
          placeholder="Type a city or region, e.g. Kolkata"
          error={errors.timezone?.message}
          {...register('timezone')}
        />
        <datalist id="workspace-timezone-options">
          {MAIN_TIMEZONES.map((tz) => (
            <option key={tz.id} value={tz.id}>{tz.label}</option>
          ))}
        </datalist>
        <p className="-mt-2 bg-caption text-(--text-muted)">Dates in digests, exports and activity use this timezone.</p>

        <StickySaveBar
          dirty={isDirty}
          saving={isSubmitting || updateMutation.isPending}
          saved={saved}
          subject="Workspace settings"
          onDiscard={() => reset()}
        />
      </form>

      {/* Export/delete act on the signed-in account (DELETE /workspaces/current deletes the user
          too), so they live in account settings' Data tab, not per-workspace settings. */}
      {!scope && <DangerZoneSection workspaceName={workspace.name} />}
    </div>
  );
}
