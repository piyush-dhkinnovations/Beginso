'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => onAuthStateChanged(auth, (user) => setEmail(user?.email ?? null)), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    setError(null);
    setIsResending(true);
    try {
      await authService.resendVerificationEmail();
      setCooldown(30);
      toast('A new verification code was sent.', 'success');
    } catch (resendError) {
      setError(getFriendlyErrorMessage(resendError));
    } finally {
      setIsResending(false);
    }
  };

  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the complete six-digit verification code.');
      return;
    }

    setError(null);
    setIsChecking(true);
    try {
      await authService.verifyEmailOtp(code);
      toast('Email verified successfully.', 'success');
      await login();
    } catch (verificationError) {
      setError(getFriendlyErrorMessage(verificationError));
    } finally {
      setIsChecking(false);
    }
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setError(null);
    setOtpDigits((current) => current.map((item, itemIndex) => (itemIndex === index ? digit : item)));
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const pasteOtp = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;
    setOtpDigits(Array.from({ length: 6 }, (_, index) => digits[index] ?? ''));
    otpRefs.current[Math.min(digits.length, 6) - 1]?.focus();
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
            ? <>Enter the six-digit code sent to <strong>{email}</strong>.</>
            : 'Sign in again to request or complete email verification.'}
        </p>
        {email && (
          <p className="text-body-sm text-neutral-500">
            Open your verification email, select <strong>View verification code</strong>, then enter the six-digit code shown on the Beginso page.
          </p>
        )}
      </div>

      {error && <p role="alert" className="w-full rounded-md border border-error/20 bg-red-50 p-3 text-body-sm font-semibold text-error">{error}</p>}

      {email && (
        <div className="flex w-full flex-col gap-3">
          <fieldset className="flex justify-center gap-2" disabled={isChecking || isResending}>
            <legend className="sr-only">Six-digit verification code</legend>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => { otpRefs.current[index] = node; }}
                value={digit}
                onChange={(event) => updateOtpDigit(index, event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  pasteOtp(event.clipboardData.getData('text'));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digit && index > 0) otpRefs.current[index - 1]?.focus();
                  if (event.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
                  if (event.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
                }}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Verification code digit ${index + 1}`}
                className="h-11 w-11 rounded-md border border-neutral-300 bg-white text-center text-heading-2 font-semibold text-neutral-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-neutral-100"
              />
            ))}
          </fieldset>
          <Button
            onClick={verifyOtp}
            isLoading={isChecking}
            disabled={isChecking || isResending || otpDigits.some((digit) => !digit)}
          >
            Verify email
          </Button>
          <Button
            variant="secondary"
            onClick={resend}
            isLoading={isResending}
            disabled={isChecking || isResending || cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification code'}
          </Button>
        </div>
      )}

      <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-sm text-brand-700 hover:text-brand-900">
        Back to login
      </Link>
    </Card>
  );
}
