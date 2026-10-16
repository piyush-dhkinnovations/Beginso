'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { notificationsService } from '@/services/notifications';
import { notificationKeys } from '@/lib/queryKeys';

export const POLL_MS = 60_000;

/**
 * Sprint 14 (B9.2, requirements 3.2, task 3.12). One shared cache entry per context, polled every
 * 60 s while the tab is visible - never in a hidden tab (`refetchIntervalInBackground: false`) and
 * never when signed out (`enabled`). Refetches immediately on window focus. The bell and the page
 * read this same key, so there is one request per interval.
 */
export function useUnreadCount(scope: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: notificationKeys.unread(scope),
    queryFn: () => notificationsService.unreadCount(scope),
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
