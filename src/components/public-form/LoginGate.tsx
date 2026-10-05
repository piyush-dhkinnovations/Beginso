'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Sprint 13 (D1.1 Mode 3 "login"). Shown INSTEAD of the form to a visitor who is not signed in. Sign in /
// create account both return here through the existing `?next=` mechanism (guarded by sanitizeNextParam on the
// auth pages, so it can only ever be an internal path). The server independently refuses an unauthenticated
// submission (LOGIN_REQUIRED) — this screen is the courtesy, not the gate.
export interface LoginGateProps {
  slug: string;
  formTitle: string;
}

export function LoginGate({ slug, formTitle }: LoginGateProps) {
  const next = encodeURIComponent(`/f/${slug}`);
  return (
    <div className="p-6 flex flex-col gap-4 text-center items-center" role="region" aria-label="Sign in required">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--accent-soft) text-(--accent-soft-text)">
        <LogIn size={22} aria-hidden="true" />
      </span>
      <div>
        <h1 className="bg-h4 font-bold text-(--text-primary)">Sign in to respond</h1>
        <p className="bg-body text-(--text-muted) mt-1">
          <strong>{formTitle}</strong> is only open to people signed in to Beginso.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/login?next=${next}`} className="sm:flex-1 sm:max-w-44">
          <Button type="button" className="w-full min-h-11">
            Sign in
          </Button>
        </Link>
        <Link href={`/signup?next=${next}`} className="sm:flex-1 sm:max-w-44">
          <Button type="button" variant="secondary" className="w-full min-h-11">
            Create account
          </Button>
        </Link>
      </div>
    </div>
  );
}
