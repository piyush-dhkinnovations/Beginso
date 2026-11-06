/**
 * A remembered crop in branding.theme.crop (cover, background, logo): the original a picture was cropped from and how it was framed, so reopening the
 * crop shows the original at the zoom and place it was left at. Only valid ones are kept, and a saved style never carries one.
 */
import { describe, it, expect } from 'vitest';
import { cleanTheme, patchTheme } from '@/lib/formTheme';
import { currentLook, snapshotStyle, styleUpdates } from '@/lib/formStyles';
import type { CropMemo, FormTheme } from '@/types/form';

const MEMO: CropMemo = { from: '/api/upload/file/u1/f1/brand/original.png', result: '/api/upload/file/u1/f1/brand/cropped.jpg', aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 1.78 };

describe('cleanTheme: crop', () => {
  it('keeps a valid memo for each of the three pictures', () => {
    const t: FormTheme = { v: 1, crop: { cover: MEMO, background: { ...MEMO, from: '/form-pictures/aurora-mint.jpg' }, logo: { ...MEMO, aspect: 1 } } };
    expect(cleanTheme(t)).toEqual(t);
  });

  it.each([
    ['an original that is not an image address', { ...MEMO, from: 'javascript:alert(1)' }],
    ['a result with a quote', { ...MEMO, result: 'https://x.test/a"b.jpg' }],
    ['a missing result', { ...MEMO, result: undefined }],
    ['a shape under 0.2', { ...MEMO, aspect: 0.1 }],
    ['a shape over 10', { ...MEMO, aspect: 11 }],
    ['a centre outside the picture', { ...MEMO, fx: 1.5 }],
    ['a negative centre', { ...MEMO, fy: -0.1 }],
    ['a zoom under 1', { ...MEMO, zoom: 0.9 }],
    ['a zoom over 4', { ...MEMO, zoom: 4.5 }],
    ['a number as text', { ...MEMO, zoom: '2' }],
    ['not a number', { ...MEMO, fx: NaN }],
  ])('drops %s', (_name, memo) => {
    expect(cleanTheme({ v: 1, crop: { cover: memo } })).toBeUndefined();
  });

  it('keeps the good one and drops the bad one beside it, and a slot it does not know', () => {
    expect(cleanTheme({ v: 1, crop: { cover: MEMO, background: { ...MEMO, zoom: 9 }, avatar: MEMO } })).toEqual({ v: 1, crop: { cover: MEMO } });
  });
});

describe('patchTheme: crop', () => {
  it('sets one picture\'s memo, and clearing the last one takes the theme back to null', () => {
    const one = patchTheme(null, 'crop', { logo: MEMO });
    expect(one).toEqual({ v: 1, crop: { logo: MEMO } });
    expect(patchTheme(one, 'crop', { logo: undefined })).toBeNull();
    expect(patchTheme({ v: 1, crop: { logo: MEMO, cover: MEMO } }, 'crop', { logo: undefined })).toEqual({ v: 1, crop: { cover: MEMO } });
  });
});

describe('a saved style and a remembered crop', () => {
  const OWN = { primaryColor: '#112233', theme: { v: 1 as const, card: { radius: 8 }, crop: { cover: MEMO } } };

  it('never carries one (it belongs to one form\'s own pictures)', () => {
    expect(snapshotStyle('classic', OWN).branding.theme).toEqual({ v: 1, card: { radius: 8 } });
  });

  it('applying a style leaves the form\'s own memo, which only counts while its picture is still the one in use', () => {
    const up = styleUpdates({ branding: { primaryColor: '#445566', theme: { v: 1, card: { radius: 12 } } } }, OWN);
    expect(up.theme).toEqual({ v: 1, card: { radius: 12 }, crop: { cover: MEMO } });
  });

  it('undo restores the whole theme exactly', () => {
    expect(currentLook(OWN).theme).toEqual(OWN.theme);
  });
});
