'use client';

// Inline, synchronous theme bootstrap (zero-flash, and it keeps following the OS setting live).
// Rendered only on the server: React 19 logs "Encountered a script tag while rendering React
// component" whenever a <script> is created on the client, and the script has already run by then,
// so the client render is an empty node. suppressHydrationWarning covers the deliberate server/client
// difference (same technique next-themes uses).
export function ThemeInitScript({ code }: { code: string }) {
  if (typeof window !== 'undefined') return null;
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />;
}
