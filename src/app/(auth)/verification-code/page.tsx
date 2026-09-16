'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { isAxiosError } from 'axios';
import { authService, type VerificationCodeReveal } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import { AuthCard } from '@/components/auth/AuthCard';

type RevealState =
  | { status: 'loading' }
  | { status: 'success'; result: VerificationCodeReveal }
  | { status: 'invalid' }
  | { status: 'error' };

export default function VerificationCodePage() {
  const [revealState, setRevealState] = useState<RevealState>({ status: 'loading' });
  const [copyMessage, setCopyMessage] = useState('');
  const ticketRef = useRef<string | null | undefined>(undefined);
  const requestRef = useRef<Promise<void> | null>(null);

  const revealCode = useCallback(async (ticket: string) => {
    setRevealState({ status: 'loading' });
    setCopyMessage('');
    try {
      const result = await authService.revealVerificationCode(ticket);
      ticketRef.current = null;
      setRevealState({ status: 'success', result });
    } catch (error) {
      if (isAxiosError(error) && [400, 404, 410].includes(error.response?.status ?? 0)) {
        ticketRef.current = null;
        setRevealState({ status: 'invalid' });
      } else {
        setRevealState({ status: 'error' });
      }
    } finally {
      requestRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (ticketRef.current === undefined) {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const ticket = fragment.get('ticket')?.trim() ?? '';
      ticketRef.current = ticket || null;
      window.history.replaceState(null, '', '/verification-code');
    }

    const ticket = ticketRef.current;
    if (!ticket) {
      setRevealState({ status: 'invalid' });
      return;
    }

    // React Strict Mode replays effects in development. Reuse the in-flight promise so a
    // single-use backend ticket is never submitted twice by the same page load.
    if (!requestRef.current) requestRef.current = revealCode(ticket);
  }, [revealCode]);

  const retry = () => {
    const ticket = ticketRef.current;
    if (!ticket || requestRef.current) return;
    requestRef.current = revealCode(ticket);
  };

  const copyCode = async () => {
    if (revealState.status !== 'success') return;
    try {
      await navigator.clipboard.writeText(revealState.result.code);
      setCopyMessage('Verification code copied.');
    } catch {
      setCopyMessage('Unable to copy automatically. Select the code and copy it manually.');
    }
  };

  if (revealState.status === 'loading') {
    return (
      <AuthCard className="flex w-full flex-col items-center gap-4 p-8 text-center" aria-busy="true">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
        <div className="space-y-1">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Opening your secure code</h1>
          <p className="text-body text-[var(--text-muted)]">This should only take a moment.</p>
        </div>
      </AuthCard>
    );
  }

  if (revealState.status === 'invalid') {
    return (
      <AuthCard className="flex w-full flex-col items-center gap-5 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-error">
          <AlertCircle size={22} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Verification link unavailable</h1>
          <p className="text-body text-[var(--text-muted)]">This link is invalid, expired, or has already been used.</p>
        </div>
        <Link
          href="/verify-email"
          className="inline-flex min-h-11 items-start font-semibold text-brand-700 hover:text-brand-900"
        >
          Request another email
        </Link>
      </AuthCard>
    );
  }

  if (revealState.status === 'error') {
    return (
      <AuthCard className="flex w-full flex-col items-center gap-5 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-warning">
          <AlertCircle size={22} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Unable to load your code</h1>
          <p className="text-body text-[var(--text-muted)]">Check your connection and try again.</p>
        </div>
        <Button className="w-full" onClick={retry}>Try again</Button>
        <Link
          href="/verify-email"
          className="inline-flex min-h-11 items-start font-semibold text-brand-700 hover:text-brand-900"
        >
          Request another email
        </Link>
      </AuthCard>
    );
  }

  const formattedCode = `${revealState.result.code.slice(0, 3)} ${revealState.result.code.slice(3)}`;

  return (
    <AuthCard className="flex w-full flex-col items-center gap-6 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <CheckCircle2 size={22} aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Your verification code</h1>
        <p className="text-body text-[var(--text-muted)]">Copy this code, then enter it on the email verification page.</p>
      </div>

      <output
        aria-label={`Verification code ${revealState.result.code.split('').join(' ')}`}
        className="w-full select-all rounded-xl border border-dashed border-brand-200 bg-brand-50 px-4 py-5 font-mono text-3xl font-bold tracking-[0.2em] text-brand-900"
      >
        {formattedCode}
      </output>

      <p className="text-body-sm text-[var(--text-muted)]">
        Expires at <time dateTime={revealState.result.expiresAt}>{new Date(revealState.result.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>.
      </p>

      <div className="flex w-full flex-col gap-3">
        <Button className="w-full gap-2" onClick={copyCode}>
          <Copy size={16} aria-hidden="true" />
          Copy code
        </Button>
      </div>

      <p aria-live="polite" className="min-h-5 text-body-sm font-medium text-[var(--text-muted)]">{copyMessage}</p>
      <p className="text-body-sm text-[var(--text-muted)]">For security, this code is displayed only once. Do not share it.</p>
    </AuthCard>
  );
}
