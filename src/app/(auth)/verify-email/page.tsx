'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/common/Toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => onAuthStateChanged(auth, (user) => setEmail(user?.email ?? null)), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const checkVerification = async () => {
    setError(null);
    setIsChecking(true);
    try {
      const verified = await authService.completeEmailVerification();
      if (!verified) {
        setError('Your email is not verified yet. Open the link in your email, then try again.');
        return;
      }
      toast('Email verified successfully.', 'success');
      await login();
    } catch (verificationError) {
      setError(getFriendlyErrorMessage(verificationError));
    } finally {
      setIsChecking(false);
    }
  };

  const resend = async () => {
    setError(null);
    setIsResending(true);
    try {
      await authService.resendVerificationEmail();
      setCooldown(30);
      toast('A new verification email was sent.', 'success');
    } catch (resendError) {
      setError(getFriendlyErrorMessage(resendError));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full p-8 flex flex-col items-center text-center gap-6">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
        <MailCheck aria-hidden="true" size={22} />
      </div>
      <div className="space-y-2">
        <h1 className="text-heading-2 font-bold text-neutral-900">Verify your email</h1>
        <p className="text-body text-neutral-600">
          {email
            ? <>We sent a verification link to <strong>{email}</strong>.</>
            : 'Sign in again to request or complete email verification.'}
        </p>
      </div>

      {error && <p role="alert" className="w-full rounded-md border border-error/20 bg-red-50 p-3 text-body-sm font-semibold text-error">{error}</p>}

      {email && (
        <div className="flex w-full flex-col gap-3">
          <Button onClick={checkVerification} isLoading={isChecking} disabled={isChecking || isResending}>
            I verified my email
          </Button>
          <Button
            variant="secondary"
            onClick={resend}
            isLoading={isResending}
            disabled={isChecking || isResending || cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </Button>
        </div>
      )}

      <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:text-brand-900">
        Back to login
      </Link>
    </Card>
  );
}
