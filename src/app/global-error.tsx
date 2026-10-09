'use client';

import { useEffect } from 'react';

// Replaces the root layout when it crashes, so no globals.css/tokens here: self-contained styles
// that follow the OS colour scheme (the app's data-theme script is not running).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Global error', error.digest ?? '(no digest)');
  }, [error]);

  return (
    <html lang="en">
      <body>
        <style>{`
          body{margin:0;font-family:system-ui,sans-serif;background:#fff;color:#0f172a}
          main{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center}
          p{margin:0;color:#475569;max-width:42ch}
          small{color:#64748b}
          .row{display:flex;gap:8px;margin-top:8px}
          button,a{font:inherit;padding:8px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:inherit;cursor:pointer;text-decoration:none}
          button{background:#2563eb;border-color:#2563eb;color:#fff}
          @media (prefers-color-scheme:dark){
            body{background:#0f172a;color:#f1f5f9}
            p{color:#cbd5e1} small{color:#94a3b8}
            a{background:#1e293b;border-color:#334155}
          }
        `}</style>
        <main role="alert">
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try again, or head back home.</p>
          <div className="row">
            <button onClick={() => retry()}>Try again</button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose: the root layout is broken */}
            <a href="/">Back to Home</a>
          </div>
          {error.digest && <small>Reference: {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
