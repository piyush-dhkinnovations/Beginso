import axiosInstance from '@/lib/axios';
import { cleanCredit } from '@/lib/formTheme';
import type { PhotoCredit } from '@/types/form';

// Unsplash photos for a form's page background and cover: GET /api/unsplash/featured and /search, POST /api/unsplash/download.
// The backend holds the Unsplash key; the browser only talks to our own API. Photos are read defensively (bare list, { data } or { photos }), and
// a photo whose pictures are not on images.unsplash.com, or whose credit is not an unsplash.com address, is dropped.

export interface UnsplashPhoto {
  id: string;
  thumb: string;
  url: string;
  alt: string;
  credit: PhotoCredit;
}

export interface UnsplashPage {
  photos: UnsplashPhoto[];
  page: number;
  totalPages: number;
}

/** Why the photos could not be had, in the words to show: `busy` (too many searches, try later) or `off` (not switched on / not answering). */
export class PhotosError extends Error {
  constructor(public kind: 'busy' | 'off' | 'other', message: string) {
    super(message);
  }
}

const onUnsplash = (u: unknown): u is string => typeof u === 'string' && u.startsWith('https://images.unsplash.com/');

function toPhoto(raw: unknown): UnsplashPhoto | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const credit = cleanCredit(r.credit);
  if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{6,24}$/.test(r.id) || !onUnsplash(r.thumb) || !onUnsplash(r.url) || !credit) return null;
  return { id: r.id, thumb: r.thumb, url: r.url, alt: typeof r.alt === 'string' ? r.alt : '', credit };
}

function photos(body: unknown): UnsplashPhoto[] {
  const b = body as { data?: unknown; photos?: unknown } | null;
  const inner = (b?.data ?? b) as { photos?: unknown } | unknown[] | null;
  const raw = Array.isArray(body) ? body : Array.isArray(inner) ? inner : (inner as { photos?: unknown } | null)?.photos ?? b?.photos;
  if (!Array.isArray(raw)) throw new PhotosError('other', 'Unexpected /api/unsplash response shape');
  return raw.map(toPhoto).filter((p): p is UnsplashPhoto => p !== null);
}

function fail(err: unknown): never {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 429) throw new PhotosError('busy', 'Photo search is busy. Try again in a few minutes.');
  if (status === 503) throw new PhotosError('off', 'Photos are not available right now.');
  if (err instanceof PhotosError) throw err;
  throw new PhotosError('other', 'Could not load photos. Try again.');
}

export const unsplashService = {
  featured: (): Promise<UnsplashPhoto[]> =>
    axiosInstance.get('/api/unsplash/featured').then((r) => photos(r.data), fail),

  search: (q: string, page = 1): Promise<UnsplashPage> =>
    axiosInstance.get('/api/unsplash/search', { params: { q: q.trim(), page } }).then((r) => {
      const d = ((r.data as { data?: unknown } | null)?.data ?? r.data) as { page?: unknown; totalPages?: unknown } | null;
      return { photos: photos(r.data), page: Number(d?.page) || page, totalPages: Number(d?.totalPages) || 1 };
    }, fail),

  /** Tells Unsplash the photo was used (their rule). Best effort: never throws. */
  download: (id: string): Promise<void> => axiosInstance.post('/api/unsplash/download', { id }).then(() => undefined, () => undefined),
};
