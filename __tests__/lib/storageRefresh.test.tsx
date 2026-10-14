import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { affectsStorage, notifyStorageMayHaveChanged, onStorageMayHaveChanged, throttleTrailing } from '@/lib/storageRefresh';
import axiosInstance from '@/lib/axios';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { StorageUsage } from '@/components/workspaces/StorageUsage';
import { settingsService } from '@/services/settings';
import type { UserProfile } from '@/types/settings';

const MB = 1024 * 1024;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('affectsStorage', () => {
  it('is true for writes to the areas that hold storage, false for reads and unrelated writes', () => {
    expect(affectsStorage('delete', '/api/trash/form/123')).toBe(true);
    expect(affectsStorage('DELETE', '/api/trash')).toBe(true);
    expect(affectsStorage('post', '/api/forms')).toBe(true);
    expect(affectsStorage('patch', '/api/forms/123')).toBe(true);
    expect(affectsStorage('post', '/api/upload')).toBe(true);
    expect(affectsStorage('delete', '/api/responses/1')).toBe(true);
    expect(affectsStorage('post', '/api/workspaces')).toBe(true);
    expect(affectsStorage('get', '/api/forms')).toBe(false);
    expect(affectsStorage('post', '/api/notifications/read')).toBe(false);
    expect(affectsStorage('patch', '/api/users/me')).toBe(false);
    expect(affectsStorage(undefined, '/api/forms')).toBe(false);
  });
});

describe('throttleTrailing', () => {
  it('turns a burst of calls into one call after the window', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttleTrailing(fn, 1000);
    throttled();
    throttled();
    throttled();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    throttled();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('axios reports successful storage writes', () => {
  it('notifies after a DELETE to /api/trash and stays quiet for a GET', async () => {
    const seen = vi.fn();
    const off = onStorageMayHaveChanged(seen);
    const adapter = async (config: any) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    await axiosInstance.get('/api/trash', { adapter });
    expect(seen).not.toHaveBeenCalled();
    await axiosInstance.delete('/api/trash/form/1', { adapter });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    notifyStorageMayHaveChanged();
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

const profile = (used: number, trash: number): UserProfile => ({
  id: 'u1',
  name: 'A',
  email: 'a@x.com',
  avatarUrl: null,
  role: 'admin',
  status: 'active',
  emailVerified: true,
  createdAt: '',
  lastLoginAt: '',
  storageUsedBytes: used,
  storageTrashBytes: trash,
  storageQuotaBytes: 500 * MB,
  workspaceCount: 1,
  workspaceLimit: 10,
});

describe('the sidebar storage bar after a delete', () => {
  it('refreshes by itself, without a reload', async () => {
    const getProfile = vi
      .spyOn(settingsService, 'getProfile')
      .mockResolvedValueOnce(profile(400 * MB, 80 * MB))
      .mockResolvedValue(profile(320 * MB, 0));

    render(
      <QueryProvider>
        <StorageUsage />
      </QueryProvider>
    );
    expect(await screen.findByText('400 MB of 500 MB')).toBeInTheDocument();

    // Emptying Trash succeeds somewhere in the app.
    const adapter = async (config: any) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    await act(async () => {
      await axiosInstance.delete('/api/trash', { adapter });
    });

    await waitFor(() => expect(screen.getByText('320 MB of 500 MB')).toBeInTheDocument(), { timeout: 4000 });
    expect(getProfile).toHaveBeenCalledTimes(2);
  });

  it('polls on its own so changes made elsewhere show up', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const getProfile = vi.spyOn(settingsService, 'getProfile').mockResolvedValue(profile(100 * MB, 0));
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <StorageUsage />
      </QueryClientProvider>
    );
    await screen.findByText('100 MB of 500 MB');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    expect(getProfile.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
