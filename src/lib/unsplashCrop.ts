// Cropping a photo from Unsplash without copying it. Unsplash asks that a photo stays linked from images.unsplash.com, and allows its image service's
// own parameters for sizing and cropping: a crop to a shape around a focal point (fit=crop, crop=focalpoint, fp-x, fp-y, fp-z), done there, on their side.
// So the studio's crop dialog gives back a shape, a focal point and a zoom, and the picture's address is rewritten; the photographer's credit stays valid.
// The crop lives in the address, so it can be read back and adjusted later.

const CROP_PARAMS = ['crop', 'h', 'fp-x', 'fp-y', 'fp-z', 'rect'];

export const isUnsplashPhoto = (url: string | null | undefined): boolean => typeof url === 'string' && url.startsWith('https://images.unsplash.com/');

/** The photo as it was before any crop: the whole picture, sized for a full-width page (what the picker gave). */
export function uncropUnsplash(url: string): string {
  const u = new URL(url);
  for (const k of CROP_PARAMS) u.searchParams.delete(k);
  u.searchParams.set('fit', 'max');
  u.searchParams.set('w', '1920'); // a crop asks for its own width; the whole photo goes back to what the picker gave
  return u.href;
}

export interface UnsplashCrop {
  /** Width over height of the cropped picture. */
  aspect: number;
  /** The centre of the cropped part, as a share of the whole picture (0 to 1 each way). */
  fx: number;
  fy: number;
  /** 1 = the largest part that fits the shape; more = closer in. */
  zoom: number;
  /** Width of the picture to ask for, in pixels. */
  width: number;
}

const unit = (n: number) => Math.min(1, Math.max(0, n));

/** The address of the photo cropped to a shape around a focal point. Only a number ever goes into a parameter. */
export function cropUnsplash(url: string, { aspect, fx, fy, zoom, width }: UnsplashCrop): string {
  const u = new URL(uncropUnsplash(url));
  u.searchParams.set('fit', 'crop');
  u.searchParams.set('crop', 'focalpoint');
  u.searchParams.set('fp-x', unit(fx).toFixed(3));
  u.searchParams.set('fp-y', unit(fy).toFixed(3));
  u.searchParams.set('fp-z', String(Math.min(10, Math.max(1, Math.round(zoom * 100) / 100))));
  u.searchParams.set('w', String(Math.round(width)));
  u.searchParams.set('h', String(Math.max(1, Math.round(width / aspect))));
  return u.href;
}

/** The crop a photo's address already carries (so the dialog can open on it and adjust it), or undefined when the photo is uncropped. */
export function readUnsplashCrop(url: string): { aspect: number; fx: number; fy: number; zoom: number } | undefined {
  try {
    const p = new URL(url).searchParams;
    if (p.get('crop') !== 'focalpoint') return undefined;
    const [fx, fy, zoom, w, h] = ['fp-x', 'fp-y', 'fp-z', 'w', 'h'].map((k) => Number(p.get(k)));
    if (![fx, fy, zoom, w, h].every((n) => Number.isFinite(n)) || w <= 0 || h <= 0) return undefined;
    return { aspect: w / h, fx: unit(fx), fy: unit(fy), zoom: Math.max(1, zoom) };
  } catch {
    return undefined;
  }
}
