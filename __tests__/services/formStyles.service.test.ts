import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), interceptors: { response: { use: vi.fn() } } },
}));

import axiosInstance from '@/lib/axios';
import { formStylesService } from '@/services/formStyles';

const ax = axiosInstance as unknown as Record<'get' | 'post' | 'patch' | 'delete', ReturnType<typeof vi.fn>>;

const STORED = { _id: 's1', name: 'Brand', layout: 'steps', branding: { primaryColor: '#0F766E', fontFamily: 'quicksand', logoUrl: '/api/upload/file/x.png', junk: 1, theme: { v: 1, colors: { text: 'red' }, card: { radius: 8 } } } };

beforeEach(() => (['get', 'post', 'patch', 'delete'] as const).forEach((k) => ax[k].mockReset()));

describe('formStylesService.list', () => {
  it('asks for the scope it is given (a workspace slug, or personal)', async () => {
    ax.get.mockResolvedValue({ data: { data: [] } });
    await formStylesService.list('acme');
    expect(ax.get).toHaveBeenCalledWith('/api/form-styles', { headers: { 'x-workspace-slug': 'acme' } });
    await formStylesService.list('personal');
    expect(ax.get.mock.calls[1][1]).toEqual({ headers: { 'x-workspace-slug': 'personal' } });
  });

  it.each([['bare list', [STORED]], ['{ data }', { data: [STORED] }], ['{ styles }', { styles: [STORED] }]])('reads a %s', async (_n, body) => {
    ax.get.mockResolvedValue({ data: body });
    const [style] = await formStylesService.list('acme');
    expect(style).toMatchObject({ id: 's1', name: 'Brand', layout: 'steps' });
  });

  it('rebuilds each style through the look filter: no upload, no unknown key, a cleaned theme', async () => {
    ax.get.mockResolvedValue({ data: { data: [STORED] } });
    const [style] = await formStylesService.list('acme');
    expect(style.branding).toEqual({ primaryColor: '#0F766E', fontFamily: 'quicksand', theme: { v: 1, card: { radius: 8 } } });
  });

  it('skips a row it cannot read, and throws on an answer that is not a list', async () => {
    ax.get.mockResolvedValue({ data: { data: [STORED, null, { name: 'no id' }, { _id: 'x' }] } });
    expect(await formStylesService.list('acme')).toHaveLength(1);
    ax.get.mockResolvedValue({ data: { data: 'nope' } });
    await expect(formStylesService.list('acme')).rejects.toThrow(/Unexpected/);
  });
});

describe('formStylesService.save, rename, remove', () => {
  it('saves only what a style keeps and returns the stored style', async () => {
    ax.post.mockResolvedValue({ data: { data: STORED } });
    const saved = await formStylesService.save('acme', { name: 'Brand', layout: 'steps', branding: { primaryColor: '#0F766E', logoUrl: 'x', bannerText: 'hi' } as never });
    expect(saved.id).toBe('s1');
    expect(ax.post).toHaveBeenCalledWith('/api/form-styles', { name: 'Brand', layout: 'steps', branding: { primaryColor: '#0F766E', logoUrl: 'x', bannerText: 'hi' } }, { headers: { 'x-workspace-slug': 'acme' } });
  });

  it('throws on a reply it cannot read', async () => {
    ax.post.mockResolvedValue({ data: {} });
    await expect(formStylesService.save('acme', { name: 'x', layout: 'classic', branding: {} })).rejects.toThrow(/Unexpected/);
  });

  it('renames and removes by id, in the scope', async () => {
    ax.patch.mockResolvedValue({ data: {} });
    ax.delete.mockResolvedValue({ data: {} });
    await formStylesService.rename('acme', 's1', 'New');
    expect(ax.patch).toHaveBeenCalledWith('/api/form-styles/s1', { name: 'New' }, { headers: { 'x-workspace-slug': 'acme' } });
    await formStylesService.remove('personal', 's1');
    expect(ax.delete).toHaveBeenCalledWith('/api/form-styles/s1', { headers: { 'x-workspace-slug': 'personal' } });
  });
});
