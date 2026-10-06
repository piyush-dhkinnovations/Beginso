'use client';

import { Alert } from '@/components/ui/Alert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/** design.md section 17 "Network" row. Cached data stays on screen; queries pause until reconnect. */
export function OfflineBanner() {
  if (useOnlineStatus()) return null;
  return (
    <Alert variant="warning" title="You're offline" role="status">
      Showing what was last loaded. It will refresh when you reconnect.
    </Alert>
  );
}
