'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authService } from '@/services/auth';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/schemas/resetPasswordSchema';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';

type ResetState = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const [resetState, setResetState] = useState<ResetState>('checking');
  const [oobCode, setOobCode] = useState('');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('oobCode');
    if (!code) {
      queueMicrotask(() => setResetState('invalid'));
      return;
    }

    verifyPasswordResetCode(auth, code)
      .then((verifiedEmail) => {
        setOobCode(code);
        setEmail(verifiedEmail);
        setResetState('ready');
      })
      .catch(() => setResetState('invalid'));
  }, []);

  const submit = async ({ password }: ResetPasswordFormValues) => {
    setServerError(null);
    setNotificationWarning(null);
    try {
      await confirmPasswordReset(auth, oobCode, password);
    } catch {
      setServerError('This password-reset link is invalid or has expired. Request a new link and try again.');
      return;
    }

    try {
      await authService.notifyPasswordResetCompleted(email);
    } catch {
      // The Firebase password update cannot be rolled back. Keep its successful state
      // accurate and report only the secondary security-email delivery failure.
      setNotificationWarning(
        'Your password was updated, but we could not send the confirmation email. You can still log in with your new password.'
      );
    }
    setResetState('success');
  };

  const visibilityButton = (visible: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
      className="flex min-h-11 min-w-11 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  if (resetState === 'checking') {
    return (
      <AuthCard className="flex w-full flex-col items-center gap-4 p-8 text-center" aria-busy="true">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
        <p className="text-body text-[var(--text-muted)]">Checking your password-reset link…</p>
      </AuthCard>
    );
  }

  if (resetState === 'invalid') {
    return (
      <AuthCard className="flex w-full flex-col items-center gap-5 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-error">
          <AlertCircle size={22} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Reset link unavailable</h1>
          <p className="text-body text-[var(--text-muted)]">This link is invalid, expired, or has already been used.</p>
        </div>
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:text-brand-900">
          Request a new reset link
        </Link>
      </AuthCard>
    );
  }

  if (resetState === 'success') {
    return (
      <AuthCard className="flex w-full flex-col items-center gap-5 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-success">
          <CheckCircle2 size={22} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Password updated</h1>
          <p className="text-body text-[var(--text-muted)]">Your password was changed successfully. You can now log in.</p>
        </div>
        {notificationWarning && (
          <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-900">
            {notificationWarning}
          </p>
        )}
        <Link
          href="/login"
          className="inline-flex min-h-11 w-full items-center justify-center text-sm rounded-md bg-slate-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-slate-900"
        >
          Back to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard className="flex w-full flex-col items-center gap-6 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <KeyRound size={22} aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Create a new password</h1>
        <p className="text-body text-[var(--text-muted)]">
          Enter a new password for <strong>{email}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit(submit)} className="flex w-full flex-col gap-4 text-left">
        <Input
          id="new-password"
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          rightSlot={visibilityButton(showPassword, () => setShowPassword((value) => !value), 'new password')}
          disabled={isSubmitting}
          {...register('password', { onChange: () => setServerError(null) })}
        />
        <Input
          id="confirm-new-password"
          label="Confirm new password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          rightSlot={visibilityButton(
            showConfirmPassword,
            () => setShowConfirmPassword((value) => !value),
            'confirmed password'
          )}
          disabled={isSubmitting}
          {...register('confirmPassword', { onChange: () => setServerError(null) })}
        />

        {serverError && (
          <p role="alert" className="rounded-md border border-error/20 bg-red-50 p-3 text-body-sm font-semibold text-error">
            {serverError}
          </p>
        )}

        <Button type="submit" className="mt-1 w-full" isLoading={isSubmitting} disabled={isSubmitting || !isValid}>
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
