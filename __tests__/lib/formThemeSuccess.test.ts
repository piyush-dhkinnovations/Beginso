/**
 * The thank-you screen in branding.theme.success: headline, accent colour, picture, confetti and an optional redirect. Only what the server accepts is
 * kept, a redirect is https only, and a form that sets none of it keeps the usual screen.
 */
import { describe, it, expect } from 'vitest';
import { brandSuccess, cleanRedirectUrl, cleanTheme, patchTheme } from '@/lib/formTheme';
import type { FormTheme } from '@/types/form';

const WHOLE: FormTheme = {
  v: 1,
  success: { headline: "You're in!", colour: '#16A34A', picture: '/form-pictures/aurora-mint.jpg', confetti: true, redirect: { url: 'https://example.com/welcome?from=form', seconds: 8 } },
};

describe('cleanRedirectUrl', () => {
  it.each(['https://example.com', 'https://example.com/a/b?x=1#top', 'https://sub.example.co.uk:8443/path', '  https://example.com  '])('accepts %j', (v) => {
    expect(cleanRedirectUrl(v)).toBe(v.trim());
  });
  it.each([
    ['http://example.com'],
    ['javascript:alert(1)'],
    ['data:text/html,hi'],
    ['//example.com'],
    ['example.com'],
    ['https://user:pass@example.com'],
    ['https://localhost'],
    ['https://example.com/a b'],
    ['https://example.com/"onload=1'],
    ['https://example.com/<x>'],
    ['https://example.com/\\evil'],
    [`https://example.com/${'a'.repeat(500)}`],
    [''],
    [null],
    [5],
  ])('refuses %j', (v) => {
    expect(cleanRedirectUrl(v)).toBeUndefined();
  });
});

describe('cleanTheme: success', () => {
  it('keeps all of it when it is valid', () => {
    expect(cleanTheme(WHOLE)).toEqual(WHOLE);
  });

  it('drops what is not valid and keeps the rest', () => {
    const t = cleanTheme({
      v: 1,
      success: { headline: '<b>Hi</b>', colour: 'green', picture: 'javascript:alert(1)', confetti: 'yes', redirect: { url: 'http://example.com', seconds: 5 }, shout: 1 },
    });
    expect(t).toBeUndefined();
    expect(cleanTheme({ v: 1, success: { headline: 'Hi', colour: 'green', redirect: { url: 'https://example.com', seconds: 99 } } })).toEqual({
      v: 1,
      success: { headline: 'Hi', redirect: { url: 'https://example.com' } },
    });
  });

  it('keeps confetti only when it is on, and takes a picture only from our library, our uploads or an https address', () => {
    expect(cleanTheme({ v: 1, success: { confetti: false, headline: 'Hi' } })?.success).toEqual({ headline: 'Hi' });
    for (const picture of ['/api/upload/file/u1/f1/brand/pic.png', '/form-pictures/aurora-mint.jpg', 'https://images.example.com/p.jpg']) {
      expect(cleanTheme({ v: 1, success: { picture } })?.success?.picture).toBe(picture);
    }
    for (const picture of ['http://x.test/p.jpg', 'data:image/png;base64,AAA', '/etc/passwd', 'https://u:p@x.test/p.jpg', 'https://x.test/a"b.jpg', 'https://x.test/a b.jpg']) {
      expect(cleanTheme({ v: 1, success: { picture } })).toBeUndefined();
    }
  });
});

describe('brandSuccess', () => {
  it('is the usual screen for a form that sets nothing', () => {
    expect(brandSuccess({})).toEqual({ headline: undefined, colour: undefined, picture: undefined, confetti: false, redirect: undefined });
  });

  it('gives the owner\'s words, colour, picture and confetti, and a redirect with 5 seconds unless another was chosen', () => {
    const s = brandSuccess({ theme: WHOLE });
    expect(s).toMatchObject({ headline: "You're in!", colour: '#16A34A', picture: '/form-pictures/aurora-mint.jpg', confetti: true });
    expect(s.redirect).toEqual({ url: 'https://example.com/welcome?from=form', seconds: 8 });
    expect(brandSuccess({ theme: { v: 1, success: { redirect: { url: 'https://example.com' } } } }).redirect).toEqual({ url: 'https://example.com', seconds: 5 });
  });

  it('asks for an uploaded picture through the app', () => {
    expect(brandSuccess({ theme: { v: 1, success: { picture: '/api/upload/file/u1/f1/brand/pic.png' } } }).picture).toBe('/api/backend/api/upload/file/u1/f1/brand/pic.png');
  });
});

describe('patchTheme: success', () => {
  it('sets a key, clears it, and an emptied theme goes back to null', () => {
    const one = patchTheme(null, 'success', { headline: 'Done' });
    expect(one).toEqual({ v: 1, success: { headline: 'Done' } });
    expect(patchTheme(one, 'success', { headline: undefined })).toBeNull();
    expect(patchTheme({ v: 1, success: { confetti: true, headline: 'Hi' } }, 'success', { headline: undefined })).toEqual({ v: 1, success: { confetti: true } });
  });
});
