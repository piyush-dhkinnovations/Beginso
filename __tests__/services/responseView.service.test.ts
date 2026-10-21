import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), interceptors: { response: { use: vi.fn() } } },
}));

import axiosInstance from '@/lib/axios';
import { responseViewService } from '@/services/responseView';
import { DEFAULT_VIEW } from '@/lib/responseView';

const get = axiosInstance.get as ReturnType<typeof vi.fn>;
const put = axiosInstance.put as ReturnType<typeof vi.fn>;
const del = axiosInstance.delete as ReturnType<typeof vi.fn>;
const TABLE = { layout: 'table', density: 'compact', showEmpty: false, showNumbers: true } as const;

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  del.mockReset();
});

describe('responseViewService', () => {
  it('reads the resolved view of one form, with the workspace header', async () => {
    get.mockResolvedValue({
      data: {
        success: true,
        resolved: { ...TABLE, source: 'personal' },
        formDefault: { ...DEFAULT_VIEW, version: 2, pinned: [], fields: [] },
        personal: { ...TABLE, scope: 'f1' },
        personalAll: null,
        dropped: [],
      },
    });
    const cfg = await responseViewService.get('f1', 'acme');
    expect(get).toHaveBeenCalledWith('/api/forms/f1/response-view', { headers: { 'x-workspace-slug': 'acme' } });
    expect(cfg.resolved).toMatchObject({ layout: 'table', source: 'personal' });
    expect(cfg.formDefault?.version).toBe(2);
    expect(cfg.personalAll).toBeNull();
  });

  it('copes with a missing or bare body: Grid, nothing personal', async () => {
    get.mockResolvedValue({ data: {} });
    expect(await responseViewService.get('f1')).toEqual({
      resolved: { ...DEFAULT_VIEW, source: 'system' },
      formDefault: null,
      personal: null,
      personalAll: null,
    });
    get.mockResolvedValue({ data: undefined });
    expect((await responseViewService.get('f1')).resolved.layout).toBe('grid');
  });

  it('saves a personal choice for one form or for all', async () => {
    put.mockResolvedValue({ data: { success: true, personal: { ...TABLE, scope: 'all' } } });
    expect(await responseViewService.savePersonal('all', TABLE, 'acme')).toMatchObject({ scope: 'all' });
    expect(put).toHaveBeenCalledWith('/api/me/response-view', { scope: 'all', ...TABLE }, { headers: { 'x-workspace-slug': 'acme' } });
    await responseViewService.savePersonal('f1', TABLE);
    expect(put).toHaveBeenLastCalledWith('/api/me/response-view', { scope: 'f1', ...TABLE }, { headers: { 'x-workspace-slug': 'personal' } });
  });

  it('clears a personal choice by scope', async () => {
    del.mockResolvedValue({ data: { success: true } });
    await responseViewService.clearPersonal('f1', 'acme');
    expect(del).toHaveBeenCalledWith('/api/me/response-view', { params: { scope: 'f1' }, headers: { 'x-workspace-slug': 'acme' } });
  });

  it('saves the form default with the version it last saw', async () => {
    put.mockResolvedValue({ data: { success: true, formDefault: { ...TABLE, version: 3, pinned: [], fields: [] } } });
    const saved = await responseViewService.saveFormDefault('f1', TABLE, 2, 'acme');
    expect(put).toHaveBeenCalledWith('/api/forms/f1/response-view-default', { expectedVersion: 2, ...TABLE }, { headers: { 'x-workspace-slug': 'acme' } });
    expect(saved.version).toBe(3);
  });

  it('lets a failure through (the caller decides what to tell the person)', async () => {
    put.mockRejectedValue(Object.assign(new Error('stale'), { response: { status: 409 } }));
    await expect(responseViewService.saveFormDefault('f1', TABLE, 1)).rejects.toThrow('stale');
  });
});
