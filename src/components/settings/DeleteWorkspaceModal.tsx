'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { useAuth } from '@/hooks/useAuth';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// Same grouping ChangePasswordModal uses for "the current password doesn't check out".
const WRONG_CREDENTIAL_CODES = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'];

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export function DeleteWorkspaceModal({ isOpen, onClose, workspaceName }: DeleteWorkspaceModalProps) {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [typedName, setTypedName] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Set when the backend refuses with 409 OWNS_SHARED_WORKSPACES: workspaces other people still belong to.
  const [sharedWorkspaces, setSharedWorkspaces] = useState<{ id: string; name: string; otherMembers: number }[]>([]);

  // Shares the cache ProfileTab/SecurityTab already populate — needed for signInWithEmailAndPassword
  // below, which requires an email even though this modal is reached from the Workspace tab.
  const { data: profile } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
    enabled: isOpen,
  });

  // Real counts for the red panel. Either call failing just means we say so, never guess a number.
  const { data: counts, isError: countsFailed } = useQuery({
    queryKey: ['delete-account-counts'],
    queryFn: async () => {
      const [forms, stats] = await Promise.all([
        formsService.getForms({ limit: 1, archived: 'true' }, { type: 'personal' }),
        responsesService.getStats(undefined, 'personal'),
      ]);
      return { forms: forms.total, responses: stats.total };
    },
    enabled: isOpen,
    retry: false,
  });
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const destroyed = counts
    ? `${plural(counts.forms, 'form')} and ${plural(counts.responses, 'response')} will be destroyed, along with all uploaded files.`
    : countsFailed
      ? "We couldn't count what is in this account right now. Every form, response and file in it will be destroyed."
      : 'Counting what will be destroyed…';

  useEffect(() => {
    if (isOpen) {
      // Resets whenever the modal opens — same accepted exception DeleteFormModal.tsx already
      // uses for this exact pattern (the component stays mounted across opens, so a close-time
      // reset alone would leave stale input the next time this modal opens).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPassword('');
      setTypedName('');
      setPasswordError(null);
      setSubmitError(null);
      setSharedWorkspaces([]);
    }
  }, [isOpen]);

  // Correctness Property 3: never enabled on a partial/incorrect match — plain strict equality
  // already rejects same-length near-misses, case variations, and whitespace-padded variants,
  // matching DeleteFormModal's existing type-to-confirm behavior (Requirement 14.4).
  const canAttemptDelete = password.length > 0 && typedName === workspaceName;

  // One action does both steps, same convention ChangePasswordModal already established: prove
  // the password via a fresh Firebase sign-in (protected pages carry no live Firebase session for
  // reauthenticateWithCredential to act on — see that component's comment), restore the
  // "no lingering Firebase session" invariant, then call the real delete. Reauth failing never
  // reaches the delete call; delete failing never reaches logout.
  async function handleDelete() {
    if (!profile || !canAttemptDelete) return;
    setPasswordError(null);
    setSubmitError(null);
    setSharedWorkspaces([]);
    setIsDeleting(true);

    let reauthToken: string;
    try {
      const credential = await signInWithEmailAndPassword(auth, profile.email, password);
      reauthToken = await credential.user.getIdToken();
      await signOut(auth).catch(() => {});
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code && WRONG_CREDENTIAL_CODES.includes(code)) {
        setPasswordError('Current password is incorrect.');
      } else {
        setSubmitError(getFriendlyErrorMessage(error));
      }
      setIsDeleting(false);
      return;
    }

    try {
      await settingsService.deleteWorkspace({ reauthToken });
    } catch (error: unknown) {
      const body = (error as { response?: { data?: { workspaces?: unknown } } })?.response?.data;
      if (Array.isArray(body?.workspaces)) {
        setSharedWorkspaces(body.workspaces as { id: string; name: string; otherMembers: number }[]);
      }
      setSubmitError(getFriendlyErrorMessage(error));
      setIsDeleting(false);
      return;
    }

    // Workspace and its owning session are gone — hard client-side logout/redirect, no in-app
    // state should assume the workspace still exists (Requirement 10.5).
    logout();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete account and workspace?"
    >
      <div className="flex flex-col gap-4 pt-2">
        <div role="alert" className="rounded-md border border-(--error-border) bg-(--error-surface) p-3 text-(--error-text) bg-body-sm">
          <p className="font-semibold">This cannot be undone.</p>
          <p className="mt-1">{destroyed} You will not be able to sign back in with this account.</p>
        </div>
        <Input
          id="delete-workspace-password"
          label="Confirm your password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError ?? undefined}
          disabled={isDeleting}
        />

        <div>
          <label htmlFor="delete-workspace-name-input" className="block bg-body-sm text-(--text-secondary) mb-1.5">
            Type <span className="font-semibold text-(--text-primary)">{workspaceName}</span> to confirm
          </label>
          <input
            id="delete-workspace-name-input"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={workspaceName}
            aria-describedby="delete-workspace-name-hint"
            disabled={isDeleting}
            className="w-full bg-(--bg-page) text-(--text-primary) border border-(--border-strong) rounded-md px-3 py-2 bg-body focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--border-default) transition-colors"
            autoComplete="off"
          />
          <p id="delete-workspace-name-hint" className="sr-only">
            Type the workspace name exactly to enable deletion.
          </p>
        </div>

        {submitError && <p className="bg-caption text-(--error-text)">{submitError}</p>}
        {sharedWorkspaces.length > 0 && (
          <ul className="list-disc pl-5 bg-caption text-(--text-secondary)" aria-label="Workspaces you still own">
            {sharedWorkspaces.map((w) => (
              <li key={w.id}>
                {w.name} ({w.otherMembers} other {w.otherMembers === 1 ? 'member' : 'members'})
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-subtle)">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            isLoading={isDeleting}
            disabled={!canAttemptDelete}
            onClick={() => void handleDelete()}
          >
            Delete account permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
}
