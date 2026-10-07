'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';
import { notificationKeys } from '@/lib/queryKeys';
import type { NotificationFilter } from '@/types/notification';

/**
 * Sprint 14 (B9.1, task 3.13) - cursor-paged notification list for one context + filter tab.
 * `limit` 30 per page for the page, ~10 for the bell dropdown (the quick view).
 */
export function useNotifications(scope: string, filter: NotificationFilter, options: { limit?: number; enabled?: boolean } = {}) {
  const { limit, enabled = true } = options;
  return useInfiniteQuery({
    queryKey: [...notificationKeys.list(scope, filter), limit ?? 'default'] as const,
    queryFn: ({ pageParam }) => notificationsService.list({ scope, filter, cursor: pageParam, limit }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}
