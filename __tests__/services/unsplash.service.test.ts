import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), interceptors: { response: { use: vi.fn() } } } }));

import axiosInstance from '@/lib/axios';
import { PhotosError, unsplashService } from '@/services/unsplash';

const ax = axiosInstance as unknown as Record<'get' | 'post', ReturnType<typeof vi.fn>>;

const PHOTO = {
  id: 'pJadQetzTkI',
  thumb: 'https://images.unsplash.com/photo-1?w=400',
  url: 'https://images.unsplash.com/photo-1?w=1920',
  alt: 'Green leaves',
  credit: { name: 'Ada Lovelace', url: 'https://unsplash.com/@ada?utm_source=beginso&utm_medium=referral' },
};

beforeEach(() => (['get', 'post'] as const).forEach((k) => ax[k].mockReset()));

describe('unsplashService.featured', () => {
  it.each([['bare list', [PHOTO]], ['{ data: list }', { data: [PHOTO] }], ['{ data: { photos } }', { data: { photos: [PHOTO] } }], ['{ photos }', { photos: [PHOTO] }]])('reads a %s', async (_n, body) => {
    ax.get.mockResolvedValue({ data: body });
    expect(await unsplashService.featured()).toEqual([PHOTO]);
    expect(ax.get).toHaveBeenCalledWith('/api/unsplash/featured');
  });

  it('drops a photo whose pictures are not on Unsplash or whose credit is not an unsplash.com address', async () => {
    ax.get.mockResolvedValue({
      data: { data: { photos: [PHOTO, { ...PHOTO, id: 'abcdef1', url: 'https://evil.example/x.jpg' }, { ...PHOTO, id: 'abcdef2', credit: { name: 'X', url: 'https://evil.example/@x' } }, { ...PHOTO, id: '!' }] } },
    });
    expect((await unsplashService.featured()).map((p) => p.id)).toEqual([PHOTO.id]);
  });

  it('turns 429 into busy, 503 into off, and anything else into a plain failure', async () => {
    for (const [status, kind] of [[429, 'busy'], [503, 'off'], [500, 'other']] as const) {
      ax.get.mockRejectedValueOnce({ response: { status } });
      await expect(unsplashService.featured()).rejects.toMatchObject({ kind });
    }
    ax.get.mockResolvedValueOnce({ data: 'nope' });
    await expect(unsplashService.featured()).rejects.toBeInstanceOf(PhotosError);
  });
});

describe('unsplashService.search', () => {
  it('sends the trimmed words and the page, and returns the paging', async () => {
    ax.get.mockResolvedValue({ data: { data: { photos: [PHOTO], page: 2, totalPages: 5 } } });
    const r = await unsplashService.search('  leaves ', 2);
    expect(ax.get).toHaveBeenCalledWith('/api/unsplash/search', { params: { q: 'leaves', page: 2 } });
    expect(r).toEqual({ photos: [PHOTO], page: 2, totalPages: 5 });
  });
});

describe('unsplashService.download', () => {
  it('tells the server which photo was used, and never throws', async () => {
    ax.post.mockResolvedValue({});
    await unsplashService.download('pJadQetzTkI');
    expect(ax.post).toHaveBeenCalledWith('/api/unsplash/download', { id: 'pJadQetzTkI' });
    ax.post.mockRejectedValue(new Error('down'));
    await expect(unsplashService.download('pJadQetzTkI')).resolves.toBeUndefined();
  });
});
