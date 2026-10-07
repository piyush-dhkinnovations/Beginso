import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { templatesService } from '@/services/templates';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;

describe('templatesService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  describe('getPublicTemplates()', () => {
    it('calls the public endpoint and unwraps the live { success, data: [...] } envelope', async () => {
      const templates = [{ _id: 't1', name: 'Job Application' }];
      mockGet.mockResolvedValueOnce({ data: { success: true, data: templates } });

      const result = await templatesService.getPublicTemplates();

      expect(mockGet).toHaveBeenCalledWith('/api/templates/public');
      expect(result).toEqual(templates);
    });

    it('also accepts a bare array and a { templates } envelope', async () => {
      const templates = [{ _id: 't1' }];
      mockGet.mockResolvedValueOnce({ data: templates });
      expect(await templatesService.getPublicTemplates()).toEqual(templates);

      mockGet.mockResolvedValueOnce({ data: { templates } });
      expect(await templatesService.getPublicTemplates()).toEqual(templates);
    });

    it('throws on a malformed response instead of returning something unusable', async () => {
      mockGet.mockResolvedValueOnce({ data: { success: true } });

      await expect(templatesService.getPublicTemplates()).rejects.toThrow(/Unexpected/);
    });
  });

  describe('useTemplate()', () => {
    it('sends no body when no destination is given', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, data: { _id: 'f1', title: 'Pitch Plan' } } });

      await templatesService.useTemplate('t1');

      expect(mockPost).toHaveBeenCalledWith('/api/templates/t1/use', undefined);
    });

    it('sends destinationWorkspaceId: null for personal space (null must not be dropped)', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, data: { _id: 'f1', title: 'x' } } });

      await templatesService.useTemplate('t1', null);

      expect(mockPost).toHaveBeenCalledWith('/api/templates/t1/use', { destinationWorkspaceId: null });
    });

    it('sends the workspace id for a workspace destination', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, data: { _id: 'f1', title: 'x' } } });

      await templatesService.useTemplate('t1', 'ws-9');

      expect(mockPost).toHaveBeenCalledWith('/api/templates/t1/use', { destinationWorkspaceId: 'ws-9' });
    });

    it('unwraps the real 201 { success, message, data: form } shape and a bare form', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, message: 'ok', data: { _id: 'f1', title: 'A' } } });
      expect(await templatesService.useTemplate('t1')).toMatchObject({ _id: 'f1' });

      mockPost.mockResolvedValueOnce({ data: { _id: 'f2', title: 'B' } });
      expect(await templatesService.useTemplate('t1')).toMatchObject({ _id: 'f2' });
    });

    it('throws when the response has no _id, rather than navigating to /forms/undefined/edit', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, data: {} } });

      await expect(templatesService.useTemplate('t1')).rejects.toThrow(/Unexpected/);
    });
  });
});
