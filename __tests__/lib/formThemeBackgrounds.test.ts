/**
 * Backgrounds and the cover height in branding.theme: the colours and angle of a gradient, how much a picture behind the page is darkened and blurred,
 * and the cover banner's height. Only what the server accepts is kept; a form that sets none draws as before.
 */
import { describe, it, expect } from 'vitest';
import { brandCoverHeight, brandWashLayers, brandWashStyle, cleanTheme, patchTheme } from '@/lib/formTheme';
import type { FormTheme } from '@/types/form';

const WHOLE: FormTheme = { v: 1, background: { from: '#1D4ED8', to: '#9333EA', angle: 45, darken: 35, blur: 8 }, cover: { height: 280 } };

describe('cleanTheme: background and cover', () => {
  it('keeps all of it when it is valid, and the edges', () => {
    expect(cleanTheme(WHOLE)).toEqual(WHOLE);
    expect(cleanTheme({ v: 1, background: { angle: 0, darken: 0, blur: 0 }, cover: { height: 120 } })).toEqual({ v: 1, background: { angle: 0, darken: 0, blur: 0 }, cover: { height: 120 } });
    expect(cleanTheme({ v: 1, background: { angle: 360, darken: 80, blur: 20 }, cover: { height: 480 } })?.cover?.height).toBe(480);
  });

  it.each([
    ['a colour that is not a hex', { background: { from: 'blue' } }],
    ['a colour with url()', { background: { to: 'url(javascript:1)' } }],
    ['an angle over 360', { background: { angle: 361 } }],
    ['a negative angle', { background: { angle: -1 } }],
    ['an angle that is not whole', { background: { angle: 45.5 } }],
    ['darken over 80', { background: { darken: 81 } }],
    ['blur over 20', { background: { blur: 21 } }],
    ['a cover under 120', { cover: { height: 119 } }],
    ['a cover over 480', { cover: { height: 481 } }],
    ['a cover that is not whole', { cover: { height: 200.5 } }],
    ['a number as text', { cover: { height: '300' } }],
  ])('drops %s', (_name, group) => {
    expect(cleanTheme({ v: 1, ...group })).toBeUndefined();
  });
});

describe('brandWashStyle: gradient', () => {
  const page = { primaryColor: '#1D4ED8', backgroundStyle: 'gradient' as const };

  it('is as it always was when the owner chose nothing: the page colour into a tint, at 135 degrees', () => {
    const s = brandWashStyle(page);
    expect(String(s.backgroundImage)).toMatch(/^linear-gradient\(135deg, #1D4ED8 0%, color-mix\(/);
  });

  it('uses the owner\'s two colours and angle', () => {
    const s = brandWashStyle({ ...page, theme: { v: 1, background: { from: '#FF0000', to: '#0000FF', angle: 60 } } });
    expect(s.backgroundImage).toBe('linear-gradient(60deg, #FF0000 0%, #0000FF 100%)');
    expect(s.backgroundColor).toBe('#FF0000');
  });

  it('takes one colour from the owner and keeps the usual for the other', () => {
    const s = brandWashStyle({ ...page, theme: { v: 1, background: { from: '#FF0000' } } });
    expect(String(s.backgroundImage)).toMatch(/^linear-gradient\(135deg, #FF0000 0%, color-mix\(/);
  });

  it('an angle of 0 is 0, not the usual', () => {
    expect(String(brandWashStyle({ ...page, theme: { v: 1, background: { angle: 0 } } }).backgroundImage)).toMatch(/^linear-gradient\(0deg,/);
  });

  it('never puts an unchecked colour into a style', () => {
    const s = brandWashStyle({ ...page, theme: { v: 1, background: { from: 'red; background: url(evil)' } } as unknown as FormTheme });
    expect(JSON.stringify(s)).not.toContain('evil');
  });
});

describe('brandWashLayers: a picture darkened and blurred', () => {
  const pic = { backgroundStyle: 'image', backgroundImageUrl: '/form-pictures/aurora-mint.jpg' };

  it('is nothing for a page that is not a picture, or a picture that is neither darkened nor blurred', () => {
    expect(brandWashLayers({ ...pic, backgroundStyle: 'gradient', theme: WHOLE })).toBeNull();
    expect(brandWashLayers({ ...pic })).toBeNull();
    expect(brandWashLayers({ ...pic, theme: { v: 1, background: { darken: 0, blur: 0 } } })).toBeNull();
    expect(brandWashLayers({ backgroundStyle: 'image', theme: WHOLE })).toBeNull(); // no picture to draw
  });

  it('darken alone is a dark veil over the picture, nothing more', () => {
    const l = brandWashLayers({ ...pic, theme: { v: 1, background: { darken: 40 } } })!;
    expect(l.veil).toEqual({ backgroundColor: 'rgba(0, 0, 0, 0.40)' });
    expect(l.image.backgroundImage).toBe('url("/form-pictures/aurora-mint.jpg")');
    expect(l.image.filter).toBeUndefined();
    expect(l.image.transform).toBeUndefined();
  });

  it('blur is a blur on the picture, scaled up a little so the edge does not show a pale rim', () => {
    const l = brandWashLayers({ ...pic, theme: { v: 1, background: { blur: 12 } } })!;
    expect(l.image).toMatchObject({ filter: 'blur(12px)', transform: 'scale(1.08)', backgroundSize: 'cover' });
    expect(l.veil).toBeUndefined();
  });

  it('both together', () => {
    const l = brandWashLayers({ ...pic, theme: WHOLE })!;
    expect(l.image.filter).toBe('blur(8px)');
    expect(l.veil?.backgroundColor).toBe('rgba(0, 0, 0, 0.35)');
  });

  it('asks for an upload through the app, and never draws an address that is not safe', () => {
    expect(brandWashLayers({ backgroundStyle: 'image', backgroundImageUrl: '/api/upload/file/u1/f1/brand/p.png', theme: WHOLE })!.image.backgroundImage).toBe('url("/api/backend/api/upload/file/u1/f1/brand/p.png")');
    expect(brandWashLayers({ backgroundStyle: 'image', backgroundImageUrl: 'javascript:alert(1)', theme: WHOLE })).toBeNull();
  });
});

describe('brandCoverHeight', () => {
  it('is the owner\'s height, or nothing', () => {
    expect(brandCoverHeight({ theme: WHOLE })).toBe(280);
    expect(brandCoverHeight({})).toBeUndefined();
    expect(brandCoverHeight({ theme: { v: 1, cover: { height: 9999 } } })).toBeUndefined();
  });
});

describe('patchTheme: background and cover', () => {
  it('sets and clears a key, and an emptied theme is null', () => {
    const one = patchTheme(null, 'background', { angle: 90 });
    expect(one).toEqual({ v: 1, background: { angle: 90 } });
    expect(patchTheme(one, 'background', { angle: undefined })).toBeNull();
    expect(patchTheme({ v: 1, cover: { height: 300 }, card: { radius: 8 } }, 'cover', { height: undefined })).toEqual({ v: 1, card: { radius: 8 } });
  });
});
