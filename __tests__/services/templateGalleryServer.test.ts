import { afterEach, describe, expect, it, vi } from 'vitest';

// The base address is read when the module loads, so each test sets it and loads the module fresh.
async function load(base = 'http://api.test/') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_API_URL', base);
  return import('@/services/templateGalleryServer');
}

const card = (slug: string, over: Record<string, unknown> = {}) => ({
  slug, name: slug, description: 'd', category: 'HR & Hiring', tags: ['a'], fieldCount: 3, estimatedMinutes: 2, featured: false, sortOrder: 1, layout: 'classic', thumbnail: null, ...over,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('readGallery', () => {
  it('reads { data, categories }', async () => {
    const { readGallery } = await load();
    const out = readGallery({ success: true, data: [card('a'), card('b')], categories: [{ name: 'HR & Hiring', count: 2 }] });
    expect(out!.cards.map((c) => c.slug)).toEqual(['a', 'b']);
    expect(out!.groups).toEqual([{ name: 'HR & Hiring', count: 2 }]);
  });

  it('reads a bare list, with no groups', async () => {
    const { readGallery } = await load();
    expect(readGallery([card('a')])!.groups).toEqual([]);
  });

  it('fills what is missing with safe values and drops what is not a card', async () => {
    const { readGallery } = await load();
    const out = readGallery({ data: [{ slug: 'x', name: 'X', category: 'C' }, { nonsense: true }, null, card('ok', { estimatedMinutes: 0, thumbnail: '' })] });
    expect(out!.cards).toHaveLength(2);
    expect(out!.cards[0]).toEqual(expect.objectContaining({ description: '', tags: [], fieldCount: 0, estimatedMinutes: 1, featured: false, thumbnail: null, layout: 'classic' }));
    expect(out!.cards[1].estimatedMinutes).toBe(1);
    expect(out!.cards[1].thumbnail).toBeNull();
  });

  it('is null when there is no list', async () => {
    const { readGallery } = await load();
    expect(readGallery(null)).toBeNull();
    expect(readGallery({ data: 'nope' })).toBeNull();
    expect(readGallery('text')).toBeNull();
  });
});

describe('fetchGallery', () => {
  it('asks the public gallery address (without a doubled slash) and keeps the answer for five minutes', async () => {
    const { fetchGallery, GALLERY_REVALIDATE_SECONDS } = await load('http://api.test/');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [card('a')], categories: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    const out = await fetchGallery();
    expect(out!.cards).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/templates/gallery');
    expect(fetchMock.mock.calls[0][1].next.revalidate).toBe(GALLERY_REVALIDATE_SECONDS);
    expect(GALLERY_REVALIDATE_SECONDS).toBe(300);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('is null, not an error, when the API answers badly, is down, or has no templates', async () => {
    const { fetchGallery } = await load();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await fetchGallery()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(await fetchGallery()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
    expect(await fetchGallery()).toBeNull();
  });

  it('does not even try when there is no API address', async () => {
    const { fetchGallery } = await load('');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchGallery()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
