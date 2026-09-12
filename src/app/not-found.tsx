import Link from 'next/link';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui';

// Server Component, deliberately: no 'use client', no browser API, no Date/random value
// anywhere in this file. Next's own built-in not-found page (rendered whenever a route
// segment 404s and this file doesn't exist) ships server markup that doesn't match what it
// hydrates to client-side — that mismatch, not anything in this app's code, was the actual
// source of a recurring hydration-mismatch console error. This file exists so every 404 in
// the app renders through our own layout/tokens instead, which has no such mismatch.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        icon={<Compass className="bg-icon" aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        actions={
          <>
            <Link href="/dashboard" className="bg-btn bg-btn-primary">
              Go to Personal Home
            </Link>
            <Link href="/workspaces" className="bg-btn bg-btn-secondary">
              Go to Workspaces
            </Link>
          </>
        }
      />
    </div>
  );
}
