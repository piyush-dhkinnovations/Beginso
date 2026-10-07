/**
 * __tests__/services/notifications.service.test.ts
 * Tests: notificationsService — endpoint/params for the now-live GET /api/notifications and
 * POST /api/notifications/:id/read, and a defensive fallback if the envelope shape is wrong.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  return {
    default: {
      get: mockGet,
      post: mockPost,
      interceptors: { response: { use: vi.fn() } },
    },
  };
});

import axiosInstance from '@/lib/axios';
import { notificationsService } from '@/services/notifications';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;

describe('notificationsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('list calls GET /api/notifications scoped by x-workspace-slug and returns a cursor page', async () => {
    const notifications = [
      { id: 'welcome-1', type: 'welcome', title: 'Welcome to Beginso!', message: '', createdAt: '', read: false },
    ];
    mockGet.mockResolvedValueOnce({ data: { success: true, notifications, nextCursor: 'c2' } });
    const result = await notificationsService.list({ scope: 'acme', filter: 'unread' });
    expect(mockGet).toHaveBeenCalledWith('/api/notifications', {
      headers: { 'x-workspace-slug': 'acme' },
      params: { limit: 30, unread: true },
    });
    expect(result).toEqual({ items: notifications, nextCursor: 'c2' });
  });

  it('list maps the Mentions tab to type=mention and passes the cursor', async () => {
    mockGet.mockResolvedValueOnce({ data: { notifications: [] } });
    await notificationsService.list({ scope: 'personal', filter: 'mentions', cursor: 'c2' });
    expect(mockGet).toHaveBeenCalledWith('/api/notifications', {
      headers: { 'x-workspace-slug': 'personal' },
      params: { limit: 30, type: 'mention', cursor: 'c2' },
    });
  });

  it('list falls back to an empty page if the response has no notifications field', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true } });
    const result = await notificationsService.list({ scope: 'personal', filter: 'all' });
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it('unreadCount reads { count } and defaults to 0 on a bad shape', async () => {
    mockGet.mockResolvedValueOnce({ data: { count: 4 } });
    expect(await notificationsService.unreadCount('acme')).toBe(4);
    expect(mockGet).toHaveBeenCalledWith('/api/notifications/unread-count', { headers: { 'x-workspace-slug': 'acme' } });
    mockGet.mockResolvedValueOnce({ data: {} });
    expect(await notificationsService.unreadCount('acme')).toBe(0);
  });

  it('markAllRead calls POST /api/notifications/read-all in the active context', async () => {
    mockPost.mockResolvedValueOnce({ data: { updated: 3 } });
    expect(await notificationsService.markAllRead('acme')).toEqual({ updated: 3 });
    expect(mockPost).toHaveBeenCalledWith('/api/notifications/read-all', undefined, { headers: { 'x-workspace-slug': 'acme' } });
  });

  it('markAsRead calls POST /api/notifications/:id/read', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });
    await notificationsService.markAsRead('welcome-1');
    expect(mockPost).toHaveBeenCalledWith('/api/notifications/welcome-1/read');
  });
});
