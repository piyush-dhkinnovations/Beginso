// The public gallery's cards, fetched on the SERVER so they are in the page's HTML (search engines and slow connections see them without running any script).
// fetch() only, no cookies, no auth: GET /api/templates/gallery is public. The answer is kept for five minutes (the catalogue changes rarely) and a
// failure (the API is down, or slow) is not an error: the page then loads the cards in the browser instead.
import type { GalleryCard, GalleryData } from '@/lib/templateGallery';

// A trailing slash in the env value would make every address //api/..., which the backend answers with a 404.
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/[/]+$/, '');
const TIMEOUT_MS = 6000;
export const GALLERY_REVALIDATE_SECONDS = 300;

const isCard = (c: unknown): c is GalleryCard => {
  const x = c as Partial<GalleryCard> | null;
  return !!x && typeof x.slug === 'string' && typeof x.name === 'string' && typeof x.category === 'string';
};

/** Reads the backend's answer defensively (a bare list, or `{ data, categories }`). Null when it is not a list of cards. */
export function readGallery(body: unknown): GalleryData | null {
  const b = body as { data?: unknown; categories?: unknown } | unknown[] | null;
  const list = Array.isArray(b) ? b : Array.isArray((b as { data?: unknown })?.data) ? ((b as { data: unknown[] }).data) : null;
  if (!list) return null;
  const cards = list.filter(isCard).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: typeof c.description === 'string' ? c.description : '',
    category: c.category,
    tags: Array.isArray(c.tags) ? c.tags.filter((t): t is string => typeof t === 'string') : [],
    fieldCount: typeof c.fieldCount === 'number' ? c.fieldCount : 0,
    estimatedMinutes: typeof c.estimatedMinutes === 'number' && c.estimatedMinutes > 0 ? c.estimatedMinutes : 1,
    featured: c.featured === true,
    sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 1000,
    layout: typeof c.layout === 'string' ? c.layout : 'classic',
    thumbnail: typeof c.thumbnail === 'string' && c.thumbnail ? c.thumbnail : null,
  }));
  const rawGroups = !Array.isArray(b) && Array.isArray((b as { categories?: unknown }).categories) ? ((b as { categories: unknown[] }).categories) : [];
  const groups = rawGroups
    .map((g) => g as { name?: unknown; count?: unknown })
    .filter((g) => typeof g.name === 'string' && typeof g.count === 'number')
    .map((g) => ({ name: g.name as string, count: g.count as number }));
  return { cards, groups };
}

export async function fetchGallery(): Promise<GalleryData | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/templates/gallery`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: GALLERY_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = readGallery(await res.json());
    return data && data.cards.length ? data : null;
  } catch {
    return null;
  }
}
