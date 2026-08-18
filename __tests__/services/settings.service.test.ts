/**
 * __tests__/services/settings.service.test.ts
 * Feature: sprint-6-settings
 * Tests: settingsService — every method's endpoint, params, body, and envelope-unwrapping
 * (the backend's own documented response format is inconsistent — some controllers nest under
 * `data`, some under a named key, some spread flat — see settings.ts's unwrapEnvelope comment)
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

  describe('getProfile', () => {
    it('calls GET /api/users/me', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'u1', name: 'Jordan' } });
      await settingsService.getProfile();
      expect(mockGet).toHaveBeenCalledWith('/api/users/me');
    });

    it('unwraps a { data: {...} } envelope', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, data: { id: 'u1', name: 'Jordan' } } });
      const result = await settingsService.getProfile();
      expect(result).toEqual({ id: 'u1', name: 'Jordan' });
    });

    it('unwraps a { user: {...} } envelope', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, user: { id: 'u1', name: 'Jordan' } } });
      const result = await settingsService.getProfile();
      expect(result).toEqual({ id: 'u1', name: 'Jordan' });
    });

    it('passes a bare (unwrapped) response through unchanged', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'u1', name: 'Jordan' } });
      const result = await settingsService.getProfile();
      expect(result).toEqual({ id: 'u1', name: 'Jordan' });
    });
  });

  it('updateProfile calls PATCH /api/users/me with the partial payload and unwraps the response', async () => {
    mockPatch.mockResolvedValueOnce({ data: { user: { id: 'u1', name: 'New Name' } } });
    const result = await settingsService.updateProfile({ name: 'New Name' });
    expect(mockPatch).toHaveBeenCalledWith('/api/users/me', { name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('notifyPasswordChanged calls POST /api/auth/password-changed with no body', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await settingsService.notifyPasswordChanged();
    expect(mockPost).toHaveBeenCalledWith('/api/auth/password-changed');
  });

  describe('getWorkspace', () => {
    it('calls GET /api/workspaces/current', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'w1', name: 'Acme' } });
      await settingsService.getWorkspace();
      expect(mockGet).toHaveBeenCalledWith('/api/workspaces/current');
    });

    it('unwraps a { workspace: {...} } envelope', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true, workspace: { id: 'w1', name: 'Acme' } } });
      const result = await settingsService.getWorkspace();
      expect(result).toEqual({ id: 'w1', name: 'Acme' });
    });
  });

  it('updateWorkspace calls PATCH /api/workspaces/current with the partial payload (name, branding, or notificationPreferences)', async () => {
    mockPatch.mockResolvedValueOnce({ data: { workspace: { id: 'w1', notificationPreferences: { newResponseEmail: false } } } });
    const result = await settingsService.updateWorkspace({ notificationPreferences: { newResponseEmail: false } });
    expect(mockPatch).toHaveBeenCalledWith('/api/workspaces/current', { notificationPreferences: { newResponseEmail: false } });
    expect(result.notificationPreferences).toEqual({ newResponseEmail: false });
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

  it('requestWorkspaceExport calls POST /api/workspaces/current/export and unwraps the returned job', async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, message: 'Export job queued successfully', exportJob: { id: 'job-1', status: 'queued', expiresAt: '2026-08-15T18:50:00.000Z' } },
    });
    const result = await settingsService.requestWorkspaceExport();
    expect(mockPost).toHaveBeenCalledWith('/api/workspaces/current/export');
    expect(result).toEqual({ id: 'job-1', status: 'queued', expiresAt: '2026-08-15T18:50:00.000Z' });
  });

  it('getExportStatus calls GET /api/workspaces/current/export/status with jobId and unwraps the job', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, exportJob: { id: 'job-1', status: 'completed', expiresAt: '' } } });
    const result = await settingsService.getExportStatus('job-1');
    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/current/export/status', { params: { jobId: 'job-1' } });
    expect(result).toEqual({ id: 'job-1', status: 'completed', expiresAt: '' });
  });

  it('deleteWorkspace calls DELETE /api/workspaces/current with the reauth payload', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await settingsService.deleteWorkspace({ reauthToken: 'fresh-token' });
    expect(mockDelete).toHaveBeenCalledWith('/api/workspaces/current', { data: { reauthToken: 'fresh-token' } });
  });
});
