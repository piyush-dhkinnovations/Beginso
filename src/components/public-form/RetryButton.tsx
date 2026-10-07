'use client';

import { Button } from '@/components/ui/Button';

// The public form's "Try again" was a raw `bg-btn bg-btn-primary` anchor in a server component.
// Reloading the same URL is all it did, so a client Button that reloads replaces it (same behaviour,
// design-system wrapper, no raw class).
export function RetryButton() {
  return (
    <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
