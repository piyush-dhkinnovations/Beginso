'use client';

import { Button } from '@/components/ui/Button';

// The public form's "Try again": reloads the same URL. A client Button, so a server component
// can offer it through the design-system wrapper.
export function RetryButton() {
  return (
    <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
