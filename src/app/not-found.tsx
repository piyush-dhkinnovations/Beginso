import { Compass } from 'lucide-react';
import { cookies } from 'next/headers';
import { ButtonLink, EmptyState } from '@/components/ui';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

// Server Component, deliberately: no 'use client', no browser API, no Date/random value
// anywhere in this file. Next's own built-in not-found page (rendered whenever a route
// segment 404s and this file doesn't exist) ships server markup that doesn't match what it
// hydrates to client-side — that mismatch, not anything in this app's code, was the actual
// source of a recurring hydration-mismatch console error. This file exists so every 404 in
// the app renders through our own layout/tokens instead, which has no such mismatch.
export default async function NotFound() {
  // Logged-out visitors would just bounce off /dashboard and /workspaces to the login page.
  const signedIn = (await cookies()).has(SESSION_COOKIE_NAME);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState illustration="not-found"
        icon={<Compass className="bg-icon" aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        actions={
          signedIn ? (
            <>
              <ButtonLink href="/dashboard">
                Go to Personal Home
              </ButtonLink>
              <ButtonLink href="/workspaces" variant="secondary">
                Go to Workspaces
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/">
                Go to homepage
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Log in
              </ButtonLink>
            </>
          )
        }
      />
    </div>
  );
}
