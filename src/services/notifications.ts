import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { AppNotification, NotificationFilter, NotificationPage } from '@/types/notification';

// GET /api/notifications confirmed live 17 Aug 2026 (newest first); Sprint 14 (B9.1-B9.3, design.md
// §11.2) extends it with `unread`, `type`, `limit`, `cursor` and context scoping via
// `x-workspace-slug`, and adds GET /unread-count and POST /read-all. The envelope has been
// inconsistent historically, so everything is read defensively - a missing key never crashes the bell.
const PAGE_LIMIT = 30;

function toNotification(raw: unknown): AppNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Record<string, unknown>;
  const id = (n.id ?? n._id) as string | undefined;
  if (!id) return null;
  return { ...(n as unknown as AppNotification), id: String(id), read: Boolean(n.read) };
}

export const notificationsService = {
  list: (params: { scope: string; filter: NotificationFilter; cursor?: string | null; limit?: number }): Promise<NotificationPage> =>
    axiosInstance
      .get('/api/notifications', {
        headers: workspaceHeaders(params.scope),
        params: {
          limit: params.limit ?? PAGE_LIMIT,
          ...(params.filter === 'unread' ? { unread: true } : {}),
          ...(params.filter === 'mentions' ? { type: 'mention' } : {}),
          ...(params.cursor ? { cursor: params.cursor } : {}),
        },
      })
      .then((r) => {
        const body = r.data as { notifications?: unknown; items?: unknown; nextCursor?: unknown } | undefined;
        const raw = body?.notifications ?? body?.items ?? (Array.isArray(body) ? body : []);
        const items = Array.isArray(raw) ? raw.map(toNotification).filter((n): n is AppNotification => n !== null) : [];
        return { items, nextCursor: typeof body?.nextCursor === 'string' ? body.nextCursor : null };
      }),

  unreadCount: (scope: string): Promise<number> =>
    axiosInstance
      .get('/api/notifications/unread-count', { headers: workspaceHeaders(scope) })
      .then((r) => (typeof r.data?.count === 'number' ? r.data.count : 0)),

  markAllRead: (scope: string): Promise<{ updated: number }> =>
    axiosInstance
      .post('/api/notifications/read-all', undefined, { headers: workspaceHeaders(scope) })
      .then((r) => ({ updated: typeof r.data?.updated === 'number' ? r.data.updated : 0 })),

  markAsRead: (id: string): Promise<void> =>
    axiosInstance.post(`/api/notifications/${id}/read`).then(() => undefined),
};
