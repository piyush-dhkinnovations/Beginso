'use client';

import { useEffect } from 'react';
import { Button, ButtonLink, EmptyState } from '@/components/ui';

interface RouteErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
}

// Shared body for every segment-level error.tsx. Renders inside the shell's content area, so it
// sets no width. Never shows error.message (server errors are already redacted in production,
// client ones are not) — only the digest, as a support reference.
export function RouteError({ error, retry, homeHref = '/dashboard' }: RouteErrorProps) {
  useEffect(() => {
    // Digest only — message/stack may carry user data.
    console.error('Route error', error.digest ?? '(no digest)');
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <EmptyState
        illustration="error"
        title="Something went wrong"
        description="We couldn't load this page. Try again, or head back home."
        actions={
          <>
            <Button onClick={() => retry()}>Try again</Button>
            <ButtonLink href={homeHref} variant="secondary">
              Back to Home
            </ButtonLink>
          </>
        }
      />
      {error.digest && (
        <p className="text-xs text-(--text-muted)">Reference: {error.digest}</p>
      )}
    </div>
  );
}
