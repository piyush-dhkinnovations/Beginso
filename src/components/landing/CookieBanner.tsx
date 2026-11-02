'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { COOKIE_CHANGE_EVENT, COOKIE_REOPEN_EVENT, readCookieConsent, saveCookieConsent } from '@/lib/cookieConsent';

const subscribe = (notify: () => void) => {
  window.addEventListener(COOKIE_CHANGE_EVENT, notify);
  return () => window.removeEventListener(COOKIE_CHANGE_EVENT, notify);
};
// the server cannot know the choice: it renders nothing, and the browser decides once it has hydrated (so the two never disagree)
const UNKNOWN = 'unknown';

/**
 * Asks once, at the bottom of the page, whether other cookies are allowed, with the page behind it softly blurred. Essential cookies
 * (staying signed in, remembering the theme) always work. The answer is saved in the browser and the bar stays away until "Cookie
 * settings" in the footer asks for it again.
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
    <>
      <div aria-hidden="true" data-testid="cookie-backdrop" className="fixed inset-0 z-40 bg-(--surface-inverse)/30 backdrop-blur-[3px]" />
      <section aria-label="Cookies" className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-2xl border border-(--border-default) bg-(--surface-card) p-6 shadow-(--shadow-hover) sm:p-8 md:flex-row md:items-center md:gap-8">
          <Cookie className="hidden size-10 shrink-0 text-(--action-primary) md:block" aria-hidden="true" />
          <div className="md:flex-1">
            <p className="bg-h5 text-(--text-primary)">We use cookies</p>
            <p className="mt-1 bg-body text-(--text-secondary)">
              We use cookies to keep you signed in and to make Beginso better. You can allow all cookies or only the ones Beginso needs.{' '}
              <Link href="/cookie-policy" className="font-semibold text-(--text-link) underline">
                Cookie Policy
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => choose('essential')}>
              Essential only
            </Button>
            <Button variant="primary" onClick={() => choose('all')}>
              Allow all
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
