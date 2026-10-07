'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// Firebase error codes that mean "the current password (or account) doesn't check out" —
// same grouping getFriendlyErrorMessage() already uses for the login flow.
const WRONG_CREDENTIAL_CODES = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'];

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function ChangePasswordModal({ isOpen, onClose, email }: ChangePasswordModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      // Protected pages deliberately carry no live Firebase session (see AuthContext — signed out
      // right after the backend session is confirmed), so there's no existing currentUser to call
      // reauthenticateWithCredential() against. Signing back in with the current password achieves
      // the same "prove you know it" property and, on success, populates auth.currentUser so
      // updatePassword() below has something to act on.
      await signInWithEmailAndPassword(auth, email, values.currentPassword);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code && WRONG_CREDENTIAL_CODES.includes(code)) {
        setError('currentPassword', { message: 'Current password is incorrect.' });
      } else {
        toast(getFriendlyErrorMessage(error), 'error');
      }
      return;
    }

    try {
      await updatePassword(auth.currentUser!, values.newPassword);
    } catch (error: unknown) {
      toast(getFriendlyErrorMessage(error), 'error');
      await signOut(auth).catch(() => {});
      return;
    }

    // Restores the "no lingering Firebase session on a protected page" invariant regardless of
    // what happens next — the password change itself already succeeded at this point.
    await signOut(auth).catch(() => {});

    try {
      await settingsService.notifyPasswordChanged();
    } catch {
      // Best-effort security-alert email — the password change itself already succeeded and
      // cannot be rolled back, so a failure here doesn't change the outcome shown to the user
      // (same reasoning /reset-password already applies for this exact secondary call).
    }

    toast('Password updated.', 'success');
    handleClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change password">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <Input
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          disabled={isSubmitting}
          {...register('currentPassword')}
        />
        <Input
          id="new-password-settings"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.newPassword?.message}
          disabled={isSubmitting}
          {...register('newPassword')}
        />
        <Input
          id="confirm-new-password-settings"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmNewPassword?.message}
          disabled={isSubmitting}
          {...register('confirmNewPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-1">
          Update password
        </Button>
      </form>
    </Modal>
  );
}
