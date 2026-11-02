'use client';

import { COOKIE_REOPEN_EVENT } from '@/lib/cookieConsent';

/** The footer link that opens the cookie bar again, so the choice can be changed. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(COOKIE_REOPEN_EVENT))}>
      Cookie settings
    </button>
  );
}
