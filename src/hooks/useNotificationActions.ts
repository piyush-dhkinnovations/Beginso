'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';
import { notificationKeys } from '@/lib/queryKeys';
import type { NotificationPage } from '@/types/notification';

type Pages = InfiniteData<NotificationPage, string | null>;

function patchPages(old: Pages | undefined, patch: (n: NotificationPage['items'][number]) => NotificationPage['items'][number]): Pages | undefined {
  return old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map(patch) })) } : old;
}

/**
 * Sprint 14 (task 3.13): mark-one-read and mark-all-read for one context. Both patch the cached
 * lists and the unread count optimistically, roll back on failure, and re-sync on settle (design.md
 * §10). The failure toast is the caller's (`mutate(…, { onError })`) so the bell, which renders in
 * every shell, does not need a ToastProvider just to mount.
 */
export function useNotificationActions(scope: string) {
  const queryClient = useQueryClient();

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: notificationKeys.all });
    return {
      lists: queryClient.getQueriesData<Pages>({ queryKey: notificationKeys.lists(scope) }),
      unread: queryClient.getQueryData<number>(notificationKeys.unread(scope)),
    };
  };
  const rollback = (context?: Awaited<ReturnType<typeof snapshot>>) => {
    context?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
    if (context?.unread !== undefined) queryClient.setQueryData(notificationKeys.unread(scope), context.unread);
  };
  const resync = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.unread(scope) });
    void queryClient.invalidateQueries({ queryKey: notificationKeys.lists(scope) });
  };

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(scope),
    onMutate: async () => {
      const context = await snapshot();
      queryClient.setQueriesData<Pages>({ queryKey: notificationKeys.lists(scope) }, (old) => patchPages(old, (n) => ({ ...n, read: true })));
      queryClient.setQueryData(notificationKeys.unread(scope), 0);
      return context;
    },
    onError: (_error, _vars, context) => rollback(context),
    onSettled: resync,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onMutate: async (id) => {
      const context = await snapshot();
      let wasUnread = false;
      queryClient.setQueriesData<Pages>({ queryKey: notificationKeys.lists(scope) }, (old) =>
        patchPages(old, (n) => {
          if (n.id === id && !n.read) wasUnread = true;
          return n.id === id ? { ...n, read: true } : n;
        }),
      );
      if (wasUnread) queryClient.setQueryData<number>(notificationKeys.unread(scope), (c) => Math.max(0, (c ?? 1) - 1));
      return context;
    },
    onError: (_error, _vars, context) => rollback(context),
    onSettled: resync,
  });

  return { markAllRead, markRead };
}
