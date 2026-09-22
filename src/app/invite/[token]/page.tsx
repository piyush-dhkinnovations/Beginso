'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authService } from '@/services/auth';
import { invitationsService } from '@/services/invitations';
import { invitationKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/roles';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

// Requirements §7.5 / design.md §5, §15.4: six states derived purely from (invitation preview,
// auth state), plus `declined` as a local transition after the Decline click (no extra request
// needed to show it, matching the wireframe's own declined-panel-swap pattern).
type ViewState =
  | 'not-signed-in'
  | 'matching'
  | 'wrong-email'
  | 'already-member'
  | 'expired'
  | 'revoked'
  | 'declined';

// A live backend crash was found to leak its raw JS exception text (e.g. "Cannot read
// properties of undefined (reading 'slug')") straight into the error envelope's `message` field
// — this repo's own PROJECT_STATUS.md already tracks the general case ("500 responses can leak
// internal error.message detail", Known Issues, backend-owned). Rather than showing a stack-trace
// -shaped string to an end user on this specific page, fall back to a generic message when the
// text doesn't read like something meant for a person.
const RAW_RUNTIME_ERROR_PATTERN = /cannot read propert|is not a function|is not defined|undefined is not|null is not|typeerror|referenceerror/i;

function describeActionError(err: unknown): string {
  const message = getFriendlyErrorMessage(err);
  return RAW_RUNTIME_ERROR_PATTERN.test(message)
    ? 'Something went wrong on our end. Please try again in a moment.'
    : message;
}

function deriveState(
  status: 'pending' | 'expired' | 'revoked' | 'accepted' | 'declined',
  callerEmailMatches: boolean | null,
  isAuthenticated: boolean,
  declinedLocally: boolean
): ViewState {
  if (declinedLocally || status === 'declined') return 'declined';
  if (status === 'expired') return 'expired';
  if (status === 'revoked') return 'revoked';
  if (status === 'accepted') return 'already-member';
  if (!isAuthenticated) return 'not-signed-in';
  if (callerEmailMatches === false) return 'wrong-email';
  return 'matching';
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-page)] px-4 py-12">
      <AuthCard className="w-full max-w-[400px] flex flex-col items-center gap-4 p-8 text-center">
        {children}
      </AuthCard>
    </div>
  );
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [declinedLocally, setDeclinedLocally] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: preview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: invitationKeys.detail(token),
    queryFn: () => invitationsService.preview(token),
    enabled: !authLoading,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => invitationsService.accept(token),
    onError: (err) => setActionError(describeActionError(err)),
  });

  const declineMutation = useMutation({
    mutationFn: () => invitationsService.decline(token),
    onSuccess: () => {
      setDeclinedLocally(true);
      queryClient.invalidateQueries({ queryKey: invitationKeys.detail(token) });
    },
    onError: (err) => setActionError(describeActionError(err)),
  });

  const handleAccept = () => {
    setActionError(null);
    acceptMutation.mutate(undefined, {
      onSuccess: (result) => {
        // Soft navigation is fine here (unlike authContext.login()'s hard navigation): the
        // caller is already authenticated with a valid session cookie before this call, so
        // there's no stale-cache-vs-new-cookie race to worry about.
        if (!result?.slug) {
          // A confirmed-live backend response shape gap (found via manual testing, not
          // hypothesized): the accept endpoint can return success without a usable `slug` —
          // known backend issue "500 responses can leak internal error.message detail" is the
          // sibling symptom of the same underlying handler bug. Fail visibly but gracefully
          // instead of crashing on `undefined.slug`.
          //
          // Real bug found and fixed: this branch never invalidated the preview query, so
          // deriveState() kept reading the invitation's last-fetched status ('pending') and left
          // the Accept/Decline row rendered — a real user saw "Your invitation was accepted"
          // directly above still-live Accept/Decline buttons. The accept call itself did succeed
          // (membership was created), so refetching now picks up status: 'accepted' from the
          // backend and deriveState() naturally swaps to the 'already-member' panel — no more
          // stale action row, and its own "Go to workspace" button retries the same idempotent
          // accept() call, which succeeds cleanly if the slug issue was transient.
          setActionError("Your invitation was accepted, but we couldn't open the workspace automatically. Go to All Workspaces to find it.");
          void queryClient.invalidateQueries({ queryKey: invitationKeys.detail(token) });
          return;
        }
        router.push(`/w/${result.slug}`);
      },
    });
  };

  const handleSwitchAccount = async () => {
    // Deliberately not useAuth().logout() — that always hard-navigates to /login with no
    // return path (its ~10 other call sites all want that). This is the one caller that needs
    // to land back on this same invite link signed out (requirements §7.5's "wrong account"
    // state), so it repeats logout()'s own sign-out steps with a different destination rather
    // than changing a widely-used shared function's behavior for one caller.
    await Promise.allSettled([authService.logout(), signOut(auth)]);
    window.location.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  };

  if (authLoading || isLoading) {
    return (
      <InviteShell>
        <Skeleton variant="circle" width={48} height={48} />
        <Skeleton variant="title" width="80%" />
        <Skeleton variant="text" width="60%" />
      </InviteShell>
    );
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return (
        <InviteShell>
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">This invitation doesn&apos;t exist</h1>
          <p className="text-body text-[var(--text-muted)]">
            Check the link you were sent, or ask the workspace owner to invite you again.
          </p>
        </InviteShell>
      );
    }
    return (
      <InviteShell>
        <AlertCircle className="text-error" size={40} aria-hidden="true" />
        <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">This link isn&apos;t working</h1>
        <p className="text-body text-[var(--text-muted)]">
          The invite link may be broken or the page failed to load. Try again.
        </p>
        <Button onClick={() => refetch()}>Retry</Button>
      </InviteShell>
    );
  }

  if (!preview) return null;

  const state = deriveState(preview.status, preview.callerEmailMatches, isAuthenticated, declinedLocally);
  const roleLabel = ROLE_LABELS[preview.role];

  if (state === 'expired') {
    return (
      <InviteShell>
        <div role="status" className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-[var(--border-default)] p-6">
          <Clock className="text-[var(--text-muted)]" size={40} aria-hidden="true" />
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">This invite has expired</h1>
          <p className="text-body text-[var(--text-muted)]">Ask {preview.inviterName} to send a new invite link.</p>
        </div>
      </InviteShell>
    );
  }

  if (state === 'revoked') {
    return (
      <InviteShell>
        <div role="status" className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-[var(--border-default)] p-6">
          <XCircle className="text-[var(--text-muted)]" size={40} aria-hidden="true" />
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">This invite was revoked</h1>
          <p className="text-body text-[var(--text-muted)]">
            Ask {preview.inviterName} for a new invite if you still need access.
          </p>
        </div>
      </InviteShell>
    );
  }

  if (state === 'declined') {
    return (
      <InviteShell>
        <div role="status" className="flex flex-col items-center gap-2">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Invitation declined</h1>
          <p className="text-body text-[var(--text-muted)]">
            You can ask the workspace owner to resend it if you change your mind.
          </p>
        </div>
      </InviteShell>
    );
  }

  if (state === 'already-member') {
    return (
      <InviteShell>
        <div role="status" className="flex flex-col items-center gap-4">
          <CheckCircle2 className="text-success" size={40} aria-hidden="true" />
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">You&apos;re already a member</h1>
          <p className="text-body text-[var(--text-muted)]">Go to {preview.workspaceName}.</p>
          {actionError && <p role="alert" className="text-body-sm text-error">{actionError}</p>}
          <Button className="w-full" isLoading={acceptMutation.isPending} onClick={handleAccept}>
            Go to workspace
          </Button>
        </div>
      </InviteShell>
    );
  }

  if (state === 'wrong-email') {
    return (
      <InviteShell>
        <div role="status" className="flex flex-col items-center gap-4">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Signed in as a different account</h1>
          <p className="text-body text-[var(--text-muted)]">
            You&apos;re signed in as {user?.email}, but this invite is for {preview.invitedEmail}.
          </p>
          <Button className="w-full" onClick={handleSwitchAccount}>
            Switch account
          </Button>
        </div>
      </InviteShell>
    );
  }

  // 'not-signed-in' or 'matching' — the two states with an active accept/decline row.
  const nextParam = encodeURIComponent(`/invite/${token}`);
  return (
    <InviteShell>
      <div role="status" className="flex flex-col items-center gap-2">
        <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">
          You are invited to join {preview.workspaceName}
        </h1>
        <p className="text-body text-[var(--text-muted)]">
          {preview.inviterName} invited you as a {roleLabel}.
        </p>
      </div>

      {actionError && <p role="alert" className="text-body-sm text-error">{actionError}</p>}

      {state === 'matching' ? (
        <div className="flex w-full gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            isLoading={declineMutation.isPending}
            onClick={() => { setActionError(null); declineMutation.mutate(); }}
          >
            Decline
          </Button>
          <Button className="flex-1" isLoading={acceptMutation.isPending} onClick={handleAccept}>
            Accept
          </Button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <Link href={`/login?next=${nextParam}`} className="bg-btn bg-btn-primary w-full">
            Sign in to accept
          </Link>
          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              isLoading={declineMutation.isPending}
              onClick={() => { setActionError(null); declineMutation.mutate(); }}
            >
              Decline
            </Button>
            <Link href={`/signup?next=${nextParam}`} className="bg-btn bg-btn-secondary flex-1">
              Sign up
            </Link>
          </div>
        </div>
      )}
    </InviteShell>
  );
}
