/**
 * A form's look as a style: what it keeps, how it is applied (and undone), and the ready-made gallery (every look valid, loadable and readable).
 */
import { describe, it, expect } from 'vitest';
import { GALLERY_STYLES, currentLook, sameLook, snapshotStyle, styleUpdates } from '@/lib/formStyles';
import { FORM_PICTURES, builtInPicture } from '@/lib/formPictures';
import { FORM_FONT_OPTIONS, cleanTheme } from '@/lib/formTheme';
import { readabilityChecks } from '@/components/form-builder/LookControls';
import type { FormBranding, LayoutPreset } from '@/types/form';

const LAYOUTS: LayoutPreset[] = ['classic', 'card_stack', 'guided', 'steps', 'split_feature', 'compact'];

const FORM: FormBranding = {
  primaryColor: '#16A34A',
  fontFamily: 'lora',
  cardStyle: 'bordered',
  logoUrl: '/api/upload/file/u1/f1/brand/logo.png',
  coverImageUrl: '/api/upload/file/u1/f1/brand/cover.png',
  backgroundImageUrl: '/form-pictures/calm-waves.jpg',
  iconName: 'briefcase',
  bannerText: 'Takes two minutes',
  bannerLinks: [{ url: 'https://x.test' }],
  theme: { v: 1, colors: { text: '#111827' }, fields: { style: 'filled' } },
};

describe('snapshotStyle', () => {
  it('keeps the look and nothing that belongs to one form', () => {
    const { layout, branding } = snapshotStyle('steps', FORM);
    expect(layout).toBe('steps');
    expect(branding).toEqual({ primaryColor: '#16A34A', fontFamily: 'lora', cardStyle: 'bordered', backgroundImageUrl: '/form-pictures/calm-waves.jpg', theme: FORM.theme });
    for (const k of ['logoUrl', 'coverImageUrl', 'iconName', 'bannerText', 'bannerLinks']) expect(branding).not.toHaveProperty(k);
  });

  it('cleans the theme and drops an uploaded picture or an outside address', () => {
    const { branding } = snapshotStyle('classic', { backgroundImageUrl: 'https://x.test/a.png', coverImageUrl: '/api/upload/file/a/b/c.png', theme: { v: 1, colors: { text: 'red' }, card: { radius: 8 } } as never });
    expect(branding).toEqual({ theme: { v: 1, card: { radius: 8 } } });
  });

  it('is empty for a form with no look settings', () => {
    expect(snapshotStyle('classic', {}).branding).toEqual({});
  });
});

describe('styleUpdates and currentLook', () => {
  const style = { branding: { primaryColor: '#0F766E', fontFamily: 'quicksand' as const, backgroundImageUrl: '/form-pictures/aurora-mint.jpg', theme: { v: 1 as const, fields: { radius: 20 } } } };

  it('gives every look key the style\'s value, and clears those the style does not name (the result is the style, not a mix)', () => {
    const u = styleUpdates(style, FORM) as Record<string, unknown>;
    expect(u.primaryColor).toBe('#0F766E');
    expect(u.fontFamily).toBe('quicksand');
    expect(u).toHaveProperty('cardStyle', undefined);
    expect(u).toHaveProperty('panelTreatment', undefined);
    expect(u.theme).toEqual({ v: 1, fields: { radius: 20 } });
  });

  it('keeps the form\'s own uploads, and its logo, text and links, because it never touches them', () => {
    const u = styleUpdates(style, FORM) as Record<string, unknown>;
    expect(u.coverImageUrl).toBe('/api/upload/file/u1/f1/brand/cover.png');
    for (const k of ['logoUrl', 'iconName', 'bannerText', 'bannerLinks']) expect(u).not.toHaveProperty(k);
  });

  it('drops a library picture the form had when the style has none, and takes the style\'s own', () => {
    const none = styleUpdates({ branding: {} }, FORM) as Record<string, unknown>;
    expect(none.backgroundImageUrl).toBeUndefined();
    expect(none.theme).toBeNull();
    expect((styleUpdates(style, FORM) as Record<string, unknown>).backgroundImageUrl).toBe('/form-pictures/aurora-mint.jpg');
  });

  it('applying a style and then putting back currentLook restores the form exactly', () => {
    const before = currentLook(FORM);
    const merged = { ...FORM, ...styleUpdates(style, FORM) };
    const restored = { ...merged, ...before };
    expect(currentLook(restored)).toEqual(currentLook(FORM));
    expect(restored.logoUrl).toBe(FORM.logoUrl);
    expect(restored.bannerText).toBe(FORM.bannerText);
  });

  it('currentLook says theme is null when the form has none, which is how a save clears it', () => {
    expect(currentLook({}).theme).toBeNull();
  });
});

describe("a style is a look, not one form's own words", () => {
  const OWN: FormBranding = {
    primaryColor: '#112233',
    coverImageUrl: 'https://images.unsplash.com/photo-1?w=1920',
    theme: { v: 1, buttons: { size: 'large', hover: 'lift' }, progress: { style: 'dots' }, labels: { submit: 'Send it' }, footer: { note: 'Thanks!' }, credit: { cover: { name: 'Ada', url: 'https://unsplash.com/@ada' } } },
  };
  const LOOK = { layout: 'classic' as LayoutPreset, branding: { primaryColor: '#445566', theme: { v: 1 as const, card: { radius: 12 } } } };

  it('keeps the button look and the progress style, and leaves out the button text, the note and the credit', () => {
    expect(snapshotStyle('classic', OWN).branding.theme).toEqual({ v: 1, buttons: { size: 'large', hover: 'lift' }, progress: { style: 'dots' } });
    expect(snapshotStyle('classic', { theme: { v: 1, labels: { next: 'Go' }, footer: { note: 'Hi' } } }).branding.theme).toBeUndefined();
  });

  it("applying a style keeps the form's own words, and the credit of a photo the style leaves alone", () => {
    const up = styleUpdates(LOOK, OWN);
    expect(up.theme).toEqual({ v: 1, card: { radius: 12 }, labels: { submit: 'Send it' }, footer: { note: 'Thanks!' }, credit: { cover: { name: 'Ada', url: 'https://unsplash.com/@ada' } } });
    expect(up.coverImageUrl).toBe(OWN.coverImageUrl);
  });

  it('drops the credit when the style replaces that picture, but still keeps the words', () => {
    const up = styleUpdates({ ...LOOK, branding: { ...LOOK.branding, coverImageUrl: '/form-pictures/aurora-mint.jpg' } }, OWN);
    expect(up.coverImageUrl).toBe('/form-pictures/aurora-mint.jpg');
    expect(up.theme).toEqual({ v: 1, card: { radius: 12 }, labels: { submit: 'Send it' }, footer: { note: 'Thanks!' } });
  });

  it('a form with no words of its own gets exactly the style, and none at all when the style has no theme', () => {
    expect(styleUpdates(LOOK, { primaryColor: '#000000' }).theme).toEqual({ v: 1, card: { radius: 12 } });
    expect(styleUpdates({ branding: { primaryColor: '#445566' } }, { primaryColor: '#000000' }).theme).toBeNull();
  });

  it('a form with only its own words keeps them when the style has no theme', () => {
    expect(styleUpdates({ branding: { primaryColor: '#445566' } }, { theme: { v: 1, labels: { submit: 'Go' } } }).theme).toEqual({ v: 1, labels: { submit: 'Go' } });
  });

  it('undo restores the whole theme exactly, words included', () => {
    expect(currentLook(OWN).theme).toEqual(OWN.theme);
  });
});

describe('sameLook', () => {
  it('ignores the order of keys and sees a different layout or value', () => {
    const a = { layout: 'classic' as const, branding: { primaryColor: '#111111', fontFamily: 'inter' as const } };
    expect(sameLook(a, { layout: 'classic', branding: { fontFamily: 'inter', primaryColor: '#111111' } })).toBe(true);
    expect(sameLook(a, { ...a, layout: 'steps' })).toBe(false);
    expect(sameLook(a, { layout: 'classic', branding: { primaryColor: '#222222', fontFamily: 'inter' } })).toBe(false);
  });
});

describe('the ready-made gallery', () => {
  it('has unique ids and names, a note, and a known layout', () => {
    expect(new Set(GALLERY_STYLES.map((g) => g.id)).size).toBe(GALLERY_STYLES.length);
    expect(new Set(GALLERY_STYLES.map((g) => g.name)).size).toBe(GALLERY_STYLES.length);
    for (const g of GALLERY_STYLES) {
      expect(g.note.length).toBeGreaterThan(5);
      expect(LAYOUTS).toContain(g.layout);
    }
    expect(GALLERY_STYLES.length).toBeGreaterThanOrEqual(12);
  });

  it.each(GALLERY_STYLES.map((g) => [g.name, g] as const))('%s only uses what exists: fonts, library pictures, a valid theme', (_n, g) => {
    const fonts = FORM_FONT_OPTIONS.map((f) => f.value);
    if (g.branding.fontFamily) expect(fonts).toContain(g.branding.fontFamily);
    if (g.branding.theme?.fonts?.heading) expect(fonts).toContain(g.branding.theme.fonts.heading);
    for (const k of ['coverImageUrl', 'backgroundImageUrl'] as const) {
      const url = g.branding[k];
      if (url) {
        expect(builtInPicture(url), `${k} ${url} is in the library`).toBeDefined();
        expect(FORM_PICTURES.some((p) => url === `/form-pictures/${p.id}.jpg`)).toBe(true);
      }
    }
    if (g.branding.theme) expect(cleanTheme(g.branding.theme)).toEqual(g.branding.theme);
    // saving it as a style changes nothing: the look is already in its saved shape
    expect(snapshotStyle(g.layout, g.branding as FormBranding).branding).toEqual(g.branding);
  });

  it.each(GALLERY_STYLES.map((g) => [g.name, g] as const))('%s is easy to read: text 4.5 to 1, field border and brand colour 3 to 1', (_n, g) => {
    const checks = readabilityChecks(g.branding as FormBranding).filter((c) => c.ratio !== null);
    const failing = checks.filter((c) => (c.ratio as number) < c.need).map((c) => `${c.id} ${(c.ratio as number).toFixed(2)} < ${c.need}`);
    expect(failing).toEqual([]);
  });

  it('a mix of layouts, so the gallery is not six looks in one layout', () => {
    expect(new Set(GALLERY_STYLES.map((g) => g.layout)).size).toBeGreaterThanOrEqual(5);
  });
});

describe('a style and the thank-you screen', () => {
  const OWN: FormBranding = {
    primaryColor: '#112233',
    theme: { v: 1, success: { headline: 'You are in', colour: '#16A34A', picture: '/form-pictures/aurora-mint.jpg', confetti: true, redirect: { url: 'https://example.com', seconds: 8 } } },
  };

  it('keeps the accent colour and the confetti, and leaves out the headline, the picture and the redirect', () => {
    expect(snapshotStyle('classic', OWN).branding.theme).toEqual({ v: 1, success: { colour: '#16A34A', confetti: true } });
    expect(snapshotStyle('classic', { theme: { v: 1, success: { headline: 'Hi', redirect: { url: 'https://example.com' } } } }).branding.theme).toBeUndefined();
  });

  it('applying a style keeps the form\'s own headline, picture and redirect, and takes the colour and confetti from the style', () => {
    const style = { branding: { primaryColor: '#445566', theme: { v: 1 as const, success: { colour: '#DC2626' } } } };
    expect(styleUpdates(style, OWN).theme).toEqual({ v: 1, success: { headline: 'You are in', picture: '/form-pictures/aurora-mint.jpg', redirect: { url: 'https://example.com', seconds: 8 }, colour: '#DC2626' } });
  });

  it('a style with no thank-you look turns the form\'s colour and confetti off, and a form with none gets none', () => {
    const plain = { branding: { primaryColor: '#445566' } };
    expect(styleUpdates(plain, OWN).theme).toEqual({ v: 1, success: { headline: 'You are in', picture: '/form-pictures/aurora-mint.jpg', redirect: { url: 'https://example.com', seconds: 8 } } });
    expect(styleUpdates(plain, { primaryColor: '#000000' }).theme).toBeNull();
  });

  it('undo restores the whole theme exactly', () => {
    expect(currentLook(OWN).theme).toEqual(OWN.theme);
  });
});
