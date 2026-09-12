'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      // Keep the message independent of account existence while remaining honest about an
      // unavailable mail service. The backend itself always returns the same 202 for known and
      // unknown addresses.
      setError('We could not send the reset email right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard className="w-full p-8 flex flex-col items-center text-center gap-6">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
        <Mail aria-hidden="true" size={22} />
      </div>
      <div className="space-y-2">
        <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Reset your password</h1>
        <p className="text-body text-[var(--text-muted)]">
          {sent
            ? 'If an account exists for that email, a password-reset link is on its way.'
            : 'Enter your email and we will send you a secure password-reset link.'}
        </p>
      </div>

      {!sent && (
        <form onSubmit={submit} className="flex w-full flex-col gap-4 text-left">
          <Input
            id="reset-email"
            type="email"
            label="Email address"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={isSubmitting}
          />
          {error && <p role="alert" className="text-body-sm font-semibold text-error">{error}</p>}
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

      <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:text-brand-900">
        Back to login
      </Link>
    </AuthCard>
  );
}
