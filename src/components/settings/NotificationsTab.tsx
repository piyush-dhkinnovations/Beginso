'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import type { NotificationPreferences, WorkspaceSettings } from '@/types/settings';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Radio } from '@/components/ui/Radio';
import { Skeleton } from '@/components/ui/Skeleton';
import { teamService } from '@/services/team';
import { teamKeys } from '@/lib/queryKeys';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useSavedFlash } from './StickySaveBar';
import { useMyNotificationPreference } from '@/hooks/useMyNotificationPreference';
import type { MemberListItem } from '@/types/team';
import type { NotificationPreference } from '../../../shared/types';

// Sprint 14 (requirements 3.5, OQ-2 decided: membership-level, no per-form override): one plain line
// per value says what is sent, and the default is stated outright. Every email carries no answers.
const ROWS: { key: keyof NotificationPreferences; label: string; help?: string }[] = [
  {
    key: 'newResponseEmail',
    label: 'Email me when a form receives a new response',
    help: 'The email names the form, the response reference and the time, with a link that needs a login. It never includes answers, questions or attachments. New members get no response emails; the person who created a form gets all of them.',
  },
  { key: 'weeklyDigestEmail', label: 'Email me a weekly summary of activity' },
  { key: 'productUpdatesEmail', label: 'Email me about product updates' },
];

const CHOICES: { value: NotificationPreference; label: string; help: string }[] = [
  { value: 'all', label: 'All responses', help: "Every new response on this workspace's forms." },
  { value: 'mine', label: 'Only mine', help: 'Responses assigned to you or on forms you created.' },
  { value: 'none', label: 'None', help: 'No response emails.' },
];

// Sprint 14 (OQ-2, task 3.17): the member's own Membership.notificationPreference. Membership-level,
// no per-form override. Optimistic on the shared members cache; a failure rolls back and toasts.
function ResponseEmailChoice({ scope }: { scope: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isLoading, isError, refetch, preference } = useMyNotificationPreference(scope);
  const key = teamKeys.members(scope);
  const [saved, flashSaved] = useSavedFlash();

  const mutation = useMutation({
    mutationFn: (next: NotificationPreference) => teamService.updateMyNotificationPreference(scope, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemberListItem[]>(key);
      queryClient.setQueryData<MemberListItem[]>(key, (old) =>
        old?.map((m) => (m.userId === user?.id ? { ...m, notificationPreference: next } : m))
      );
      return { previous };
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast(getFriendlyErrorMessage(_e, { action: 'change your response email setting', fallback: 'Your response email setting was not saved. Please try again.' }), 'error');
    },
    onSuccess: (_d, next) => {
      flashSaved();
      toast(`Response emails set to "${CHOICES.find((c) => c.value === next)?.label ?? next}".`, 'success');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (isLoading) return <Skeleton variant="text" width="60%" height={96} />;
  if (isError || !preference) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">Unable to load your response email setting.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-busy={mutation.isPending}>
      <legend className="bg-label">Email me about new responses</legend>
      <p role="status" className="min-h-5 bg-caption text-(--success-text)">{saved ? 'Saved' : ''}</p>
      <p className="bg-caption text-(--text-muted)">
        New members get no response emails. Form creators get all. The email never includes answers, questions or attachments.
      </p>
      {CHOICES.map((c) => (
        <Radio
          key={c.value}
          id={`response-email-${c.value}`}
          name="response-email"
          value={c.value}
          label={c.label}
          description={c.help}
          checked={preference === c.value}
          onChange={() => mutation.mutate(c.value)}
        />
      ))}
    </fieldset>
  );
}

// Preferences live on the workspace document (confirmed live 18 Aug 2026), so this reads/writes
// through settingsKeys.workspace() — the same cache WorkspaceTab/BrandingTab already share, not a
// dedicated notifications query.
export function NotificationsTab({ scope }: { scope?: string }) {
  // Inside a workspace this tab is the member's own preference; account settings keeps the toggles.
  return scope ? <ResponseEmailChoice scope={scope} /> : <AccountNotifications />;
}

function AccountNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, flashSaved] = useSavedFlash();

  const { data: workspace, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: () => settingsService.getWorkspace(),
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
      onError: (err, _next, context) => {
        if (context?.previous) queryClient.setQueryData(settingsKeys.workspace(), context.previous);
        toast(getFriendlyErrorMessage(err, { action: 'change notification settings', fallback: `"${ROWS.find((r) => r.key === key)?.label}" was not saved. Please try again.` }), 'error');
      },
      onSuccess: (_d, next) => {
        flashSaved();
        toast(`${ROWS.find((r) => r.key === key)?.label}: ${next ? 'on' : 'off'}.`, 'success');
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
      <p role="status" className="min-h-5 bg-caption text-(--success-text)">{saved ? 'Saved' : ''}</p>
      {ROWS.map(({ key, label, help }) => {
        const mutation = mutationByKey[key];
        const inputId = `notif-${key}`;
        return (
          <div key={key} className="flex items-center justify-between gap-4 min-h-11 py-1">
            <div className="min-w-0">
              <label htmlFor={inputId} className="bg-body-sm text-(--text-primary)">
                {label}
              </label>
              {help && <p id={`${inputId}-help`} className="mt-0.5 bg-caption text-(--text-muted)">{help}</p>}
            </div>
            <div className="flex items-center gap-2">
              {mutation.isPending && (
                <span className="h-3 w-3 rounded-full border-2 border-(--border-default) border-t-(--action-primary) animate-spin" />
              )}
              <Switch id={inputId} aria-describedby={help ? `${inputId}-help` : undefined} checked={prefs[key]} onChange={(next) => mutation.mutate(next)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
