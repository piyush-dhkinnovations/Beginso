/**
 * __tests__/services/settings.service.test.ts
 * Feature: sprint-6-settings
 * Tests: settingsService — every method's endpoint, params, and body
 * Requirements: 13.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  return {
    default: {
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      delete: mockDelete,
      interceptors: { response: { use: vi.fn() } },
    },
  };
});

import axiosInstance from '@/lib/axios';
import { settingsService } from '@/services/settings';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockPatch = axiosInstance.patch as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

describe('settingsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('getProfile calls GET /api/users/me', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 'u1', name: 'Jordan' } });
    const result = await settingsService.getProfile();
    expect(mockGet).toHaveBeenCalledWith('/api/users/me');
    expect(result).toEqual({ id: 'u1', name: 'Jordan' });
  });

  it('updateProfile calls PATCH /api/users/me with the partial payload', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 'u1', name: 'New Name' } });
    const result = await settingsService.updateProfile({ name: 'New Name' });
    expect(mockPatch).toHaveBeenCalledWith('/api/users/me', { name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('notifyPasswordChanged calls POST /api/auth/password-changed with no body', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await settingsService.notifyPasswordChanged();
    expect(mockPost).toHaveBeenCalledWith('/api/auth/password-changed');
  });

  it('getWorkspace calls GET /api/workspaces/current', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 'w1', name: 'Acme' } });
    const result = await settingsService.getWorkspace();
    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/current');
    expect(result.name).toBe('Acme');
  });

  it('updateWorkspace calls PATCH /api/workspaces/current with the partial payload', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 'w1', name: 'New Name' } });
    await settingsService.updateWorkspace({ name: 'New Name' });
    expect(mockPatch).toHaveBeenCalledWith('/api/workspaces/current', { name: 'New Name' });
  });

  it('getNotificationPreferences calls GET /api/workspaces/current/notifications', async () => {
    mockGet.mockResolvedValueOnce({ data: { newResponseEmail: true } });
    await settingsService.getNotificationPreferences();
    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/current/notifications');
  });

  it('updateNotificationPreferences calls PATCH /api/workspaces/current/notifications with the partial payload', async () => {
    mockPatch.mockResolvedValueOnce({ data: { newResponseEmail: false } });
    await settingsService.updateNotificationPreferences({ newResponseEmail: false });
    expect(mockPatch).toHaveBeenCalledWith('/api/workspaces/current/notifications', { newResponseEmail: false });
  });

  it('getSessions calls GET /api/auth/sessions', async () => {
    mockGet.mockResolvedValueOnce({ data: { sessions: [] } });
    const result = await settingsService.getSessions();
    expect(mockGet).toHaveBeenCalledWith('/api/auth/sessions');
    expect(result).toEqual({ sessions: [] });
  });

  it('revokeSession calls DELETE /api/auth/sessions/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await settingsService.revokeSession('session-2');
    expect(mockDelete).toHaveBeenCalledWith('/api/auth/sessions/session-2');
  });

  it('requestWorkspaceExport calls POST /api/workspaces/current/export with no body', async () => {
    mockPost.mockResolvedValueOnce({ data: { jobId: 'export-1', status: 'queued' } });
    const result = await settingsService.requestWorkspaceExport();
    expect(mockPost).toHaveBeenCalledWith('/api/workspaces/current/export');
    expect(result.jobId).toBe('export-1');
  });

  it('getExportStatus calls GET /api/workspaces/current/export/:jobId', async () => {
    mockGet.mockResolvedValueOnce({ data: { jobId: 'export-1', status: 'completed' } });
    await settingsService.getExportStatus('export-1');
    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/current/export/export-1');
  });

  it('deleteWorkspace calls DELETE /api/workspaces/current with the reauth payload', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await settingsService.deleteWorkspace({ reauthToken: 'fresh-token' });
    expect(mockDelete).toHaveBeenCalledWith('/api/workspaces/current', { data: { reauthToken: 'fresh-token' } });
  });
});
