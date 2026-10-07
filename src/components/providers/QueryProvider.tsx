'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState } from 'react';

// Sensible app-wide defaults; a query that needs fresher/longer-lived data overrides locally.
//  - staleTime 30s: navigating back to a screen (or two components mounting the same key) reuses the
//    cache instead of refetching on every mount.
//  - retry: never on 4xx (400/401/403/404 will not change on retry), once on 5xx / network blips.
//  - refetchOnWindowFocus off: it was the main source of duplicate requests; mutations invalidate
//    precise keys instead.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response && error.response.status < 500) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: shouldRetry,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
