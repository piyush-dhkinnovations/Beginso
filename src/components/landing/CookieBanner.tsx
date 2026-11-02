'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { COOKIE_CHANGE_EVENT, COOKIE_REOPEN_EVENT, readCookieConsent, saveCookieConsent } from '@/lib/cookieConsent';

const subscribe = (notify: () => void) => {
  window.addEventListener(COOKIE_CHANGE_EVENT, notify);
  return () => window.removeEventListener(COOKIE_CHANGE_EVENT, notify);
};
// the server cannot know the choice: it renders nothing, and the browser decides once it has hydrated (so the two never disagree)
const UNKNOWN = 'unknown';

/**
 * Asks once, at the bottom of the page, whether other cookies are allowed. Essential cookies (staying signed in, remembering the theme)
 * always work. The answer is saved in the browser and the bar stays away until "Cookie settings" in the footer asks for it again.
 */
export function CookieBanner() {
  const saved = useSyncExternalStore(subscribe, readCookieConsent, () => UNKNOWN);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(COOKIE_REOPEN_EVENT, open);
    return () => window.removeEventListener(COOKIE_REOPEN_EVENT, open);
  }, []);

  if (saved === UNKNOWN || (saved !== null && !reopened)) return null;

  const choose = (choice: 'all' | 'essential') => {
    saveCookieConsent(choice);
    setReopened(false);
  };

  return (
    <section
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-hover) sm:flex-row sm:items-center sm:gap-6">
        <p className="bg-body-sm text-(--text-secondary) sm:flex-1">
          We use cookies to keep you signed in and to make Beginso better. You can allow all cookies or only the ones Beginso needs.{' '}
          <Link href="/cookie-policy" className="font-semibold text-(--text-link) underline">
            Cookie Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="small" onClick={() => choose('essential')}>
            Essential only
          </Button>
          <Button variant="primary" size="small" onClick={() => choose('all')}>
            Allow all
          </Button>
        </div>
      </div>
    </section>
  );
}
