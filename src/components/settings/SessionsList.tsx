'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import type { SessionSummary } from '@/types/settings';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaginationControls } from '@/components/responses/PaginationControls';
import { SessionRow } from './SessionRow';

// Backend returns the full session list unpaginated (confirmed contract) — paged client-side.
const PAGE_SIZE = 10;

export function SessionsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.sessions(),
    queryFn: settingsService.getSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => settingsService.revokeSession(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<{ sessions: SessionSummary[] }>(settingsKeys.sessions(), (old) =>
        old ? { sessions: old.sessions.filter((s) => s.id !== id) } : old
      );
      toast('Session revoked.', 'success');
    },
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'revoke session', fallback: 'Failed to revoke session. Please try again.' }), 'error'),
    onSettled: () => setPendingRevokeId(null),
  });

  const signOutAllMutation = useMutation({
    mutationFn: () => settingsService.revokeOtherSessions(),
    onSuccess: ({ revoked }) => {
      queryClient.setQueryData<{ sessions: SessionSummary[] }>(settingsKeys.sessions(), (old) =>
        old ? { sessions: old.sessions.filter((s) => s.isCurrent) } : old
      );
      toast(revoked > 0 ? `Signed out of ${revoked} other ${revoked === 1 ? 'device' : 'devices'}.` : 'There were no other devices to sign out.', 'success');
    },
    onError: (e) => toast(getFriendlyErrorMessage(e, { action: 'sign out of other devices', fallback: 'Could not sign out of your other devices. Please try again.' }), 'error'),
    onSettled: () => {
      setConfirmSignOutAll(false);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.sessions() });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <div className="h-11 bg-(--border-default) rounded w-full" />
        <div className="h-11 bg-(--border-subtle) rounded w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">Unable to load your sessions.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  // The backend also returns sessions that were already signed out; they are history, not devices to manage.
  const sessions = data.sessions.filter((s) => !s.revokedAt);
  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const pendingSession = pendingRevokeId ? sessions.find((s) => s.id === pendingRevokeId) : undefined;

  // Clamped at render time (not just after revoke) so any shrink of the list — revoking the
  // only session on the last page, a refetch returning fewer sessions — can't strand `page`
  // past the new end and silently slice out of range.
  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSessions = sessions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="bg-body-sm text-(--text-muted)">Devices that are signed in to your account right now.</p>
        <Button variant="secondary" size="small" disabled={otherSessions.length === 0} onClick={() => setConfirmSignOutAll(true)}>
          Sign out of all other devices
        </Button>
      </div>

      <div className="flex flex-col gap-1 divide-y divide-(--border-subtle) rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        {pageSessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            onRevoke={setPendingRevokeId}
            isRevoking={revokeMutation.isPending && pendingRevokeId === session.id}
          />
        ))}
        {otherSessions.length === 0 && (
          <p className="bg-body-sm text-(--text-muted) py-2">No other active sessions.</p>
        )}
      </div>

      <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} />

      <Modal
        isOpen={confirmSignOutAll}
        onClose={() => setConfirmSignOutAll(false)}
        title="Sign out of all other devices?"
        description={`You'll stay signed in here. ${otherSessions.length} other ${otherSessions.length === 1 ? 'device' : 'devices'} will be signed out and must sign in again.`}
      >
        <div className="flex flex-col gap-3 pt-4 border-t border-(--border-subtle)">
          <Button type="button" variant="destructive" isLoading={signOutAllMutation.isPending} onClick={() => signOutAllMutation.mutate()}>
            Sign out other devices
          </Button>
          <button
            type="button"
            onClick={() => setConfirmSignOutAll(false)}
            className="min-h-11 bg-body-sm text-(--text-muted) hover:text-(--text-primary) underline underline-offset-2 py-1"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={pendingSession !== undefined}
        onClose={() => setPendingRevokeId(null)}
        title="Revoke this session?"
        description={pendingSession ? `You'll be signed out on ${pendingSession.deviceLabel}. You can sign back in there anytime.` : undefined}
      >
        <div className="flex flex-col gap-3 pt-4 border-t border-(--border-subtle)">
          <Button
            type="button"
            variant="destructive"
            isLoading={revokeMutation.isPending}
            onClick={() => pendingRevokeId && revokeMutation.mutate(pendingRevokeId)}
          >
            Revoke session
          </Button>
          <button
            type="button"
            onClick={() => setPendingRevokeId(null)}
            className="min-h-11 bg-body-sm text-(--text-muted) hover:text-(--text-primary) underline underline-offset-2 py-1"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
