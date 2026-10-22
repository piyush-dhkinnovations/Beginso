'use client';

import { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CodeInput } from '@/components/ui/CodeInput';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { publicFormService } from '@/services/publicForm';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

// "Anyone, with a verified email": shown INSTEAD of the form until the respondent has proven an address. Three ways in, one screen:
//  - type an email, get a 6-digit code, type it here (no account, no password);
//  - continue with Google (that is a Beginso sign-in, so their submissions also show under My submissions);
//  - already signed in to Beginso: one button, no code.
// The server enforces all of it again on submit; this screen is the courtesy, not the gate.
export type VerifiedIdentity = { kind: 'code'; email: string; verificationId: string } | { kind: 'account' };

export interface EmailGateProps {
  slug: string;
  formTitle: string;
  /** Shown above the form, e.g. when a confirmation ran out and has to be done again. */
  notice?: string | null;
  onVerified: (identity: VerifiedIdentity) => void;
}

const RESEND_AFTER_S = 30;
// Set just before the Google sign-in (which reloads the page onto this form): the reload then goes straight in as that account.
const googleFlagKey = (slug: string) => `beginso:gate-google:${slug}`;
function takeGoogleFlag(slug: string): boolean {
  try {
    const hit = sessionStorage.getItem(googleFlagKey(slug)) === '1';
    if (hit) sessionStorage.removeItem(googleFlagKey(slug));
    return hit;
  } catch {
    return false;
  }
}
const isEmailLike = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function EmailGate({ slug, formTitle, notice, onVerified }: EmailGateProps) {
  const { user, login } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [useOther, setUseOther] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'check' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const emailRef = useRef<HTMLInputElement | null>(null);
  // Back from the Google sign-in: no "Continue as ..." screen, straight into the form.
  const [fromGoogle] = useState(() => takeGoogleFlag(slug));
  const handedOn = useRef(false);
  useEffect(() => {
    if (fromGoogle && user && !handedOn.current) {
      handedOn.current = true;
      onVerified({ kind: 'account' });
    }
  }, [fromGoogle, user, onVerified]);

  // Resend is offered again 30 seconds after the last email.
  useEffect(() => {
    if (step !== 'code' || sentAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step, sentAt]);
  const wait = sentAt === null ? 0 : Math.max(0, Math.ceil((sentAt + RESEND_AFTER_S * 1000 - now) / 1000));

  async function sendCode() {
    if (!isEmailLike(email)) {
      setError('Enter a valid email address.');
      emailRef.current?.focus();
      return;
    }
    setBusy('send');
    setError(null);
    try {
      const { verificationId: id } = await publicFormService.requestEmailVerification(slug, email.trim());
      setVerificationId(id);
      setCode('');
      setSentAt(Date.now());
      setNow(Date.now());
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send the code. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function checkCode(value: string) {
    if (!verificationId) return;
    setBusy('check');
    setError(null);
    try {
      const r = await publicFormService.checkEmailCode(slug, verificationId, value);
      if (r.state === 'verified') {
        onVerified({ kind: 'code', email: r.email ?? email.trim().toLowerCase(), verificationId });
        return;
      }
      setCode('');
      if (r.state === 'wrong') setError(`That code is not right. ${r.attemptsLeft} ${r.attemptsLeft === 1 ? 'try' : 'tries'} left.`);
      else if (r.state === 'locked') setError('Too many wrong codes. Send a new code to try again.');
      else if (r.state === 'expired') setError('That code has expired. Send a new one.');
      else setError('That code no longer works. Send a new one.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not check the code. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    setBusy('google');
    setError(null);
    try {
      await authService.loginWithGoogle();
      // The account is now signed in; the page reloads onto this same form and goes straight in (see fromGoogle).
      try {
        sessionStorage.setItem(googleFlagKey(slug), '1');
      } catch {
        /* a private window: the reload then offers "Continue as ..." instead */
      }
      await login(`/f/${encodeURIComponent(slug)}`);
    } catch (err) {
      setBusy(null);
      setError(getFriendlyErrorMessage(err));
    }
  }

  const signedIn = !!user && !useOther;
  if (fromGoogle && user) {
    return (
      <p role="status" className="p-6 text-center bg-body text-(--text-muted)">
        Signing you in…
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 p-6 md:p-8" role="region" aria-label="Confirm your email">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--accent-soft) text-(--accent-soft-text)">
        <Mail size={22} aria-hidden="true" />
      </span>
      <div className="text-center">
        <h1 className="bg-h4 font-bold text-(--text-primary)">{step === 'code' ? 'Enter your code' : 'Confirm your email to respond'}</h1>
        <p className="bg-body mt-1 text-(--text-muted)">
          {step === 'code' ? (
            <>
              We sent a 6-digit code to <strong className="text-(--text-primary)">{email.trim()}</strong>.
            </>
          ) : (
            <>
              <strong>{formTitle}</strong> asks everyone to confirm their email first. It takes a few seconds.
            </>
          )}
        </p>
      </div>

      {notice && (
        <p role="status" className="w-full max-w-sm rounded-lg bg-(--warning-surface) px-3 py-2 bg-body-sm text-(--warning-text)">
          {notice}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-4">
        {signedIn ? (
          <>
            <Button type="button" className="w-full min-h-11" onClick={() => onVerified({ kind: 'account' })}>
              Continue as {user!.email}
            </Button>
            <button type="button" className="bg-body-sm font-semibold text-(--accent-soft-text) hover:underline" onClick={() => setUseOther(true)}>
              Use a different email
            </button>
          </>
        ) : step === 'email' ? (
          <>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
              noValidate
            >
              <Input
                ref={emailRef}
                id="gate-email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error ?? undefined}
                disabled={busy !== null}
              />
              <Button type="submit" className="w-full min-h-11" isLoading={busy === 'send'} disabled={busy !== null}>
                Send code
              </Button>
            </form>
            <div className="flex items-center gap-3 text-(--text-muted)" aria-hidden="true">
              <span className="h-px flex-1 bg-(--border-default)" />
              <span className="bg-caption">OR CONTINUE WITH</span>
              <span className="h-px flex-1 bg-(--border-default)" />
            </div>
            <GoogleSignInButton onClick={() => void google()} isLoading={busy === 'google'} disabled={busy !== null} />
          </>
        ) : (
          <>
            <CodeInput
              label="6-digit code"
              value={code}
              onChange={setCode}
              onComplete={(v) => void checkCode(v)}
              error={error}
              disabled={busy === 'check'}
              autoFocus
            />
            <Button type="button" className="w-full min-h-11" isLoading={busy === 'check'} disabled={code.length !== 6 || busy !== null} onClick={() => void checkCode(code)}>
              Continue
            </Button>
            <div className="flex items-center justify-between gap-3 bg-body-sm">
              <button
                type="button"
                className="font-semibold text-(--accent-soft-text) hover:underline disabled:text-(--text-disabled) disabled:no-underline"
                disabled={wait > 0 || busy !== null}
                onClick={() => void sendCode()}
              >
                {wait > 0 ? `Send a new code (${wait}s)` : 'Send a new code'}
              </button>
              <button
                type="button"
                className="font-semibold text-(--accent-soft-text) hover:underline"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
              >
                Change email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
