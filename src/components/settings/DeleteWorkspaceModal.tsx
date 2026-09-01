'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
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

  // Shares the cache ProfileTab/SecurityTab already populate — needed for signInWithEmailAndPassword
  // below, which requires an email even though this modal is reached from the Workspace tab.
  const { data: profile } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
    enabled: isOpen,
  });

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
      title="Delete workspace?"
      description="This permanently deletes your account, workspace, and all forms, responses, and files. You will not be able to sign back in with this account. This cannot be undone."
    >
      <div className="flex flex-col gap-4 pt-2">
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
          <label htmlFor="delete-workspace-name-input" className="block text-body-sm text-neutral-600 mb-1.5">
            Type <span className="font-semibold text-neutral-900">{workspaceName}</span> to confirm
          </label>
          <input
            id="delete-workspace-name-input"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={workspaceName}
            aria-describedby="delete-workspace-name-hint"
            disabled={isDeleting}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-body focus:outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 transition-colors"
            autoComplete="off"
          />
          <p id="delete-workspace-name-hint" className="sr-only">
            Type the workspace name exactly to enable deletion.
          </p>
        </div>

        {submitError && <p className="text-caption text-rose-600">{submitError}</p>}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
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
            Delete permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
}
