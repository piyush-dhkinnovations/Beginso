'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RESEND_AFTER_MS, type EmailVerification } from '@/hooks/useEmailVerification';

export const isEmailLike = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

interface ControlProps {
  verification: EmailVerification;
  /** What is typed in the email field now. */
  email: string;
  disabled?: boolean;
}

/** True once THIS address is verified (a verification for another address does not count). */
export const isVerifiedFor = (v: EmailVerification, email: string): boolean =>
  v.status === 'verified' && !!v.verificationId && v.email === email.trim().toLowerCase();

// Seconds until "Resend" is offered again; 0 when it may be pressed.
function useCooldown(sentAt: number | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || sentAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active, sentAt]);
  return sentAt === null ? 0 : Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000));
}

/** The button at the right of the email input: Verify, then Resend while the email is on its way, then a "Verified" mark. */
export function VerifyEmailButton({ verification, email, disabled }: ControlProps) {
  const cooldown = useCooldown(verification.sentAt, verification.status === 'pending');
  if (isVerifiedFor(verification, email)) {
    return (
      <span role="status" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-(--success-surface) px-3 bg-body-sm font-semibold text-(--success-text)">
        <CheckCircle2 size={16} aria-hidden="true" />
        Verified
      </span>
    );
  }
  const pending = verification.status === 'pending';
  return (
    <Button
      type="button"
      variant="secondary"
      className="shrink-0"
      isLoading={verification.status === 'sending'}
      disabled={disabled || !isEmailLike(email) || (pending && cooldown > 0)}
      onClick={() => void verification.send(email)}
    >
      {pending ? (cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend') : 'Verify'}
    </Button>
  );
}

/** The line under the input: what to do next, or what went wrong. */
export function VerifyEmailNote({ verification, email }: Omit<ControlProps, 'disabled'>) {
  if (isVerifiedFor(verification, email)) return null;
  if (verification.status === 'pending') {
    return (
      <p role="status" className="bg-caption text-(--text-muted)">
        We sent a link to <strong className="text-(--text-primary)">{verification.email}</strong>. Open it and tap the button in the email, then come back here.
      </p>
    );
  }
  if (verification.message) {
    return (
      <p role="alert" className="bg-caption text-(--error-text)">
        {verification.message}
      </p>
    );
  }
  return <p className="bg-caption text-(--text-muted)">Verify your email to submit. We will send you a link to confirm it.</p>;
}
