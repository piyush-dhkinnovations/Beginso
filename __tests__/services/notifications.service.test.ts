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

  it('getNotifications calls GET /api/notifications and returns the list', async () => {
    const notifications = [
      { id: 'welcome-1', type: 'welcome', title: 'Welcome to Beginso!', message: '', createdAt: '', read: false },
    ];
    mockGet.mockResolvedValueOnce({ data: { success: true, notifications } });
    const result = await notificationsService.getNotifications();
    expect(mockGet).toHaveBeenCalledWith('/api/notifications');
    expect(result).toEqual(notifications);
  });

  it('getNotifications falls back to an empty list if the response has no notifications field', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true } });
    const result = await notificationsService.getNotifications();
    expect(result).toEqual([]);
  });

  it('markAsRead calls POST /api/notifications/:id/read', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });
    await notificationsService.markAsRead('welcome-1');
    expect(mockPost).toHaveBeenCalledWith('/api/notifications/welcome-1/read');
  });
});
