'use client';

import { useEffect, useState } from 'react';

// The owner can send people on to another page after they have sent the form. Nobody is moved without being told: the place is named, there is a
// countdown, and "Stay here" stops it. Only an https address ever gets here (see cleanRedirectUrl). In the studio's preview nothing moves.
export function SuccessRedirect({ url, seconds, preview }: { url: string; seconds: number; preview?: boolean }) {
  const [left, setLeft] = useState(seconds);
  const [stopped, setStopped] = useState(false);
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* only a valid https address is ever passed in */
  }

  useEffect(() => {
    if (preview || stopped) return;
    if (left <= 0) {
      window.location.assign(url);
      return;
    }
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, stopped, preview, url]);

  if (preview) {
    return (
      <p className="mb-6 bg-body-sm text-(--text-secondary)">
        After {seconds} seconds people are taken to <strong className="font-semibold">{host}</strong>.
      </p>
    );
  }

  return (
    <div className="mb-6 flex flex-col items-center gap-2 bg-body-sm text-(--text-secondary)" data-testid="redirect-notice">
      {stopped ? (
        <p>
          You stayed here.{' '}
          <a href={url} rel="noopener noreferrer" className="font-semibold underline">
            Go to {host}
          </a>
        </p>
      ) : (
        <>
          <p>
            Taking you to <strong className="font-semibold">{host}</strong> in {left} {left === 1 ? 'second' : 'seconds'}.
          </p>
          <button type="button" onClick={() => setStopped(true)} className="rounded-md px-2 py-1 font-semibold underline focus-visible:outline-2 focus-visible:outline-(--border-focus)">
            Stay here
          </button>
        </>
      )}
    </div>
  );
}
