/**
 * Cropping a photo from Unsplash without copying it: the crop is a shape, a focal point and a zoom in the photo's own address, done by Unsplash's image
 * service. It can be read back (to adjust it) and undone (to start from the whole photo), and the photo stays on images.unsplash.com.
 */
import { describe, it, expect } from 'vitest';
import { cropUnsplash, isUnsplashPhoto, readUnsplashCrop, uncropUnsplash } from '@/lib/unsplashCrop';

const PHOTO = 'https://images.unsplash.com/photo-1506744038136?w=1920&q=75&fit=max&auto=format';
const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe('isUnsplashPhoto', () => {
  it('is only for an address on images.unsplash.com over https', () => {
    expect(isUnsplashPhoto(PHOTO)).toBe(true);
    for (const v of ['http://images.unsplash.com/x', 'https://unsplash.com/photos/x', 'https://evil.example/https://images.unsplash.com/x', '/form-pictures/a.jpg', '', null, undefined]) {
      expect(isUnsplashPhoto(v)).toBe(false);
    }
  });
});

describe('cropUnsplash', () => {
  it('asks Unsplash for the shape around the focal point, and stays on its address', () => {
    const url = cropUnsplash(PHOTO, { aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 1.78, width: 1600 });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://images.unsplash.com/photo-1506744038136');
    expect(params(url)).toMatchObject({ fit: 'crop', crop: 'focalpoint', 'fp-x': '0.300', 'fp-y': '0.600', 'fp-z': '1.78', w: '1600', h: '500', q: '75', auto: 'format' });
  });

  it('keeps the numbers in range', () => {
    const p = params(cropUnsplash(PHOTO, { aspect: 1, fx: -2, fy: 9, zoom: 99, width: 512 }));
    expect(p).toMatchObject({ 'fp-x': '0.000', 'fp-y': '1.000', 'fp-z': '10', w: '512', h: '512' });
    expect(params(cropUnsplash(PHOTO, { aspect: 1, fx: 0.5, fy: 0.5, zoom: 0.2, width: 512 }))['fp-z']).toBe('1');
  });

  it('crops again from the whole photo, not on top of an earlier crop', () => {
    const once = cropUnsplash(PHOTO, { aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 2, width: 1600 });
    const twice = cropUnsplash(once, { aspect: 1, fx: 0.5, fy: 0.5, zoom: 1, width: 512 });
    expect(params(twice)).toMatchObject({ 'fp-x': '0.500', 'fp-z': '1', w: '512', h: '512' });
    expect(new URL(twice).searchParams.getAll('fp-x')).toHaveLength(1);
  });
});

describe('uncropUnsplash and readUnsplashCrop', () => {
  it('uncropping gives back the whole photo, as the picker gave it', () => {
    const cropped = cropUnsplash(PHOTO, { aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 2, width: 1600 });
    const whole = uncropUnsplash(cropped);
    expect(params(whole)).toMatchObject({ w: '1920', fit: 'max', q: '75', auto: 'format' });
    for (const k of ['crop', 'h', 'fp-x', 'fp-y', 'fp-z', 'rect']) expect(params(whole)[k]).toBeUndefined();
  });

  it('reads back the crop an address carries, so it can be adjusted', () => {
    const cropped = cropUnsplash(PHOTO, { aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 1.78, width: 1600 });
    expect(readUnsplashCrop(cropped)).toEqual({ aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 1.78 });
  });

  it('an uncropped photo, or an address that is not one, carries no crop', () => {
    expect(readUnsplashCrop(PHOTO)).toBeUndefined();
    expect(readUnsplashCrop('not a url')).toBeUndefined();
    const base = 'https://images.unsplash.com/photo-1?q=75'; // no width of its own, so the one in the test is the only one
    expect(readUnsplashCrop(`${base}&crop=focalpoint&fp-x=abc&fp-y=0.5&fp-z=1&w=100&h=100`)).toBeUndefined();
    expect(readUnsplashCrop(`${base}&crop=focalpoint&fp-x=0.5&fp-y=0.5&fp-z=1&w=0&h=100`)).toBeUndefined();
  });
});
