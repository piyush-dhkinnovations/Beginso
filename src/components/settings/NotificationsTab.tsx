'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import type { NotificationPreferences, WorkspaceSettings } from '@/types/settings';
import { useToast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';

const ROWS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'newResponseEmail', label: 'Email me when a form receives a new response' },
  { key: 'weeklyDigestEmail', label: 'Email me a weekly summary of activity' },
  { key: 'productUpdatesEmail', label: 'Email me about product updates' },
];

// Preferences live on the workspace document (confirmed live 18 Aug 2026), so this reads/writes
// through settingsKeys.workspace() — the same cache WorkspaceTab/BrandingTab already share, not a
// dedicated notifications query.
export function NotificationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: settingsService.getWorkspace,
  });

  // Correctness Property 2: after any sequence of flips (including failed ones), the displayed
  // state must always equal the last server-confirmed state, never a stranded optimistic value.
  // onMutate snapshots + optimistically updates; onError rolls back to that exact snapshot;
  // onSettled re-syncs from the server regardless of outcome.
  function useToggleMutation(key: keyof NotificationPreferences) {
    return useMutation({
      mutationFn: (next: boolean) => settingsService.updateWorkspace({ notificationPreferences: { [key]: next } }),
      onMutate: async (next: boolean) => {
        await queryClient.cancelQueries({ queryKey: settingsKeys.workspace() });
        const previous = queryClient.getQueryData<WorkspaceSettings>(settingsKeys.workspace());
        queryClient.setQueryData<WorkspaceSettings>(settingsKeys.workspace(), (old) =>
          old ? { ...old, notificationPreferences: { ...old.notificationPreferences, [key]: next } } : old
        );
        return { previous };
      },
      onError: (_err, _next, context) => {
        if (context?.previous) queryClient.setQueryData(settingsKeys.workspace(), context.previous);
        toast('Failed to update notification preference. Please try again.', 'error');
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.workspace() }),
    });
  }

  const newResponseMutation = useToggleMutation('newResponseEmail');
  const weeklyDigestMutation = useToggleMutation('weeklyDigestEmail');
  const productUpdatesMutation = useToggleMutation('productUpdatesEmail');
  const mutationByKey = {
    newResponseEmail: newResponseMutation,
    weeklyDigestEmail: weeklyDigestMutation,
    productUpdatesEmail: productUpdatesMutation,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-11 bg-(--border-default) rounded w-full" />
        <div className="h-11 bg-(--bg-subtle) rounded w-full" />
        <div className="h-11 bg-(--bg-subtle) rounded w-full" />
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">Unable to load notification preferences.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  const prefs = workspace.notificationPreferences;

  return (
    <div className="flex flex-col gap-1">
      {ROWS.map(({ key, label }) => {
        const mutation = mutationByKey[key];
        const inputId = `notif-${key}`;
        return (
          <div key={key} className="flex items-center justify-between gap-4 min-h-11 py-1">
            <label htmlFor={inputId} className="bg-body-sm text-(--text-primary)">
              {label}
            </label>
            <div className="flex items-center gap-2">
              {mutation.isPending && (
                <span className="h-3 w-3 rounded-full border-2 border-(--border-default) border-t-(--action-primary) animate-spin" />
              )}
              <Switch id={inputId} checked={prefs[key]} onChange={(next) => mutation.mutate(next)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
