'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

// Sprint 13 (D1.1 Mode 3 "login"). Shown INSTEAD of the form to a visitor who is not signed in. Signing in happens right here
// (email and password, or Google) and comes back to this same form; only "Create account" goes to the main sign-up page, through
// the existing `?next=` mechanism (guarded by sanitizeNextParam on the auth pages, so it can only ever be an internal path).
// The server independently refuses an unauthenticated submission (LOGIN_REQUIRED) - this screen is the courtesy, not the gate.
export interface LoginGateProps {
  slug: string;
  formTitle: string;
}

export function LoginGate({ slug, formTitle }: LoginGateProps) {
  const here = `/f/${encodeURIComponent(slug)}`;
  return (
    <div className="flex flex-col items-center gap-5 p-6 md:p-8" role="region" aria-label="Sign in required">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--accent-soft) text-(--accent-soft-text)">
        <LogIn size={22} aria-hidden="true" />
      </span>
      <div className="text-center">
        <h1 className="bg-h4 font-bold text-(--text-primary)">Sign in to respond</h1>
        <p className="bg-body mt-1 text-(--text-muted)">
          <strong>{formTitle}</strong> is only open to people signed in to Beginso.
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* useSearchParams() inside LoginForm needs a Suspense boundary during prerender. */}
        <Suspense>
          <LoginForm redirectTo={here} submitLabel="Sign in" />
        </Suspense>
      </div>

      <p className="bg-body-sm text-center text-(--text-muted)">
        New to Beginso?{' '}
        <Link href={`/signup?next=${encodeURIComponent(here)}`} className="font-semibold text-(--accent-soft-text) hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
