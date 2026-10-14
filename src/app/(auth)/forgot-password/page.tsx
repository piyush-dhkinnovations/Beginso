'use client';

import { StateArt } from '@/components/illustrations/Illustration';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth';
import { loginSchema } from '@/lib/schemas/loginSchema';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNoAccount(false);
    const parsed = loginSchema.shape.email.safeParse(email.trim());
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Please enter a valid email address');
      return;
    }
    setFieldError(undefined);
    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setSent(true);
    } catch (requestError) {
      // The backend now says whether the address can get a link (no account, Google-only, suspended, too many requests), with
      // a message written for the person; anything else (mail service down, network) gets the generic line.
      const res = (requestError as { response?: { status?: number; data?: { message?: unknown; code?: unknown } } })?.response;
      const known = res?.status !== undefined && [400, 403, 404, 429].includes(res.status) && typeof res.data?.message === 'string';
      setError(known ? (res!.data!.message as string) : 'We could not send the reset email right now. Please try again.');
      setNoAccount(res?.data?.code === 'ACCOUNT_NOT_FOUND');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mailIcon = (
    <div className="w-12 h-12 rounded-full bg-(--accent-soft) flex items-center justify-center text-(--text-link)">
      <Mail aria-hidden="true" size={22} />
    </div>
  );

  return (
    <AuthCard className="w-full flex flex-col items-center text-center gap-6">
      {sent ? (
        <StateArt name="email-sent" size="sm" fallback={mailIcon} />
      ) : (
        mailIcon
      )}
      <div className="space-y-2">
        <h1 className="bg-h3 font-bold text-(--text-primary)">Reset your password</h1>
        <p className="bg-body text-(--text-muted)">
          {sent
            ? `A password-reset link is on its way to ${email.trim()}.`
            : 'Enter your email and we will send you a secure password-reset link.'}
        </p>
      </div>

      {!sent && (
        <form onSubmit={submit} noValidate className="flex w-full flex-col gap-4 text-left">
          <Input
            id="reset-email"
            type="email"
            label="Email address"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setFieldError(undefined); }}
            error={fieldError}
            autoComplete="email"
            required
            disabled={isSubmitting}
          />
          {error && (
            <p role="alert" className="bg-body-sm font-semibold text-(--error-text)">
              {error}
              {noAccount && (
                <>
                  {' '}
                  <Link href="/signup" className="underline">Create an account</Link>
                </>
              )}
            </p>
          )}
          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}

      {sent && (
        <Button type="button" className="w-full" onClick={() => setSent(false)}>
          Try another email
        </Button>
      )}

      <Link href="/login" className="inline-flex min-h-11 items-start bg-body-sm font-semibold text-(--accent-soft-text) hover:text-(--accent-soft-text)">
        Back to login
      </Link>
    </AuthCard>
  );
}
