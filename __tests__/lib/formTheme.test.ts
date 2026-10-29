import { describe, it, expect } from 'vitest';
import {
  brandButtonStyle,
  brandCoverObjectPosition,
  brandGapClass,
  brandShowsProgress,
  brandTypeStyle,
  brandCardClass,
  brandPanelStyle,
  brandWashStyle,
  FORM_FONT_OPTIONS,
  PAGE_BACKGROUND_OPTIONS,
} from '@/lib/formTheme';

describe('brandButtonStyle', () => {
  it('is solid by default with the default blue and 8px radius', () => {
    expect(brandButtonStyle({})).toEqual({ backgroundColor: '#1D4ED8', color: '#FFFFFF', border: '1.5px solid #1D4ED8', borderRadius: '8px' });
  });

  it('inverts for outline', () => {
    expect(brandButtonStyle({ buttonStyle: 'outline', primaryColor: '#ff0000', buttonRadius: '16px' })).toEqual({
      backgroundColor: '#FFFFFF', color: '#ff0000', border: '1.5px solid #ff0000', borderRadius: '16px',
    });
  });
});

describe('small helpers', () => {
  it('cover position', () => {
    expect(brandCoverObjectPosition({ coverPosition: 'top' })).toBe('top');
    expect(brandCoverObjectPosition({ coverPosition: 'bottom' })).toBe('bottom');
    expect(brandCoverObjectPosition({})).toBe('center');
  });

  it('gap class by spacing', () => {
    expect(brandGapClass({ spacing: 'compact' })).toBe('gap-2');
    expect(brandGapClass({ spacing: 'spacious' })).toBe('gap-6');
    expect(brandGapClass({})).toBe('gap-4');
  });

  it('progress is on unless false', () => {
    expect(brandShowsProgress({})).toBe(true);
    expect(brandShowsProgress({ showProgress: true })).toBe(true);
    expect(brandShowsProgress({ showProgress: false })).toBe(false);
  });
});

describe('brandTypeStyle', () => {
  it('defaults to DM Sans, default scale', () => {
    const s = brandTypeStyle({}) as Record<string, string>;
    expect(s.fontFamily).toBe(FORM_FONT_OPTIONS[0].stack);
    expect(s['--bg-font-sans']).toBe(FORM_FONT_OPTIONS[0].stack);
    expect(s['--form-headline']).toBe('1.75rem');
    expect(s.fontSize).toBe('1rem');
  });

  it('applies font and scale', () => {
    const s = brandTypeStyle({ fontFamily: 'lora', typeScale: 'large' }) as Record<string, string>;
    expect(s.fontFamily).toContain('--font-lora');
    expect(s['--form-headline']).toBe('2.25rem');
    expect(s.fontSize).toBe('1.0625rem');
    expect((brandTypeStyle({ typeScale: 'compact' }) as Record<string, string>)['--form-headline']).toBe('1.375rem');
  });
});

describe('brandCardClass', () => {
  it('varies by card style', () => {
    expect(brandCardClass({ cardStyle: 'flat' })).not.toMatch(/border|shadow/);
    expect(brandCardClass({ cardStyle: 'bordered' })).toContain('border-2');
    expect(brandCardClass({ cardStyle: 'elevated' })).toContain('shadow-2xl');
    expect(brandCardClass({})).toContain('shadow-lg');
  });

  it('the four looks differ in their corners as well as their edge, so the choice is plain to see', () => {
    const corners = (cardStyle: 'flat' | 'soft' | 'bordered' | 'elevated') => brandCardClass({ cardStyle }).match(/rounded-[a-z0-9]+/)?.[0];
    expect(new Set(['flat', 'soft', 'bordered', 'elevated'].map((s) => corners(s as 'flat'))).size).toBe(4);
    expect(brandCardClass({ cardStyle: 'bordered' })).toContain('border-(--action-primary)');
  });
});

describe('brandPanelStyle', () => {
  it('solid by default', () => {
    expect(brandPanelStyle({})).toEqual({ backgroundColor: '#1D4ED8' });
  });
  it('gradient and pattern use the brand colour', () => {
    expect(brandPanelStyle({ primaryColor: '#123456', panelTreatment: 'gradient' }).backgroundImage).toContain('linear-gradient(135deg, #123456');
    const p = brandPanelStyle({ primaryColor: '#123456', panelTreatment: 'pattern' });
    expect(p.backgroundSize).toBe('18px 18px');
    expect(p.backgroundColor).toBe('#123456');
  });
});

describe('brandWashStyle', () => {
  it('has a label for every background option used in the switch', () => {
    expect(PAGE_BACKGROUND_OPTIONS.map((o) => o.value)).toEqual(['wash', 'plain', 'solid', 'gradient', 'mesh', 'dots', 'grid', 'image']);
  });

  it('none is transparent, plain uses the subtle page colour', () => {
    expect(brandWashStyle({ backgroundStyle: 'none' })).toEqual({ backgroundColor: 'transparent' });
    expect(brandWashStyle({ backgroundStyle: 'plain' })).toEqual({ backgroundColor: 'var(--bg-subtle)' });
  });

  it('solid prefers backgroundColor over primaryColor', () => {
    expect(brandWashStyle({ backgroundStyle: 'solid', backgroundColor: '#111111', primaryColor: '#222222' })).toEqual({ backgroundColor: '#111111' });
    expect(brandWashStyle({ backgroundStyle: 'solid', primaryColor: '#222222' })).toEqual({ backgroundColor: '#222222' });
  });

  it('image: JSON-quotes an http(s) url, otherwise falls back to a tint', () => {
    const ok = brandWashStyle({ backgroundStyle: 'image', backgroundImageUrl: 'https://cdn.test/a.png' });
    expect(ok.backgroundImage).toBe('url("https://cdn.test/a.png")');
    expect(ok.backgroundSize).toBe('cover');
    const bad = brandWashStyle({ backgroundStyle: 'image', backgroundImageUrl: 'javascript:alert(1)' });
    expect(bad.backgroundImage).toBeUndefined();
    expect(bad.backgroundColor).toContain('color-mix');
  });

  it('patterns produce an image and the default is the glow', () => {
    for (const s of ['gradient', 'mesh', 'dots', 'grid'] as const) {
      expect(brandWashStyle({ backgroundStyle: s }).backgroundImage).toBeTruthy();
    }
    const wash = brandWashStyle({});
    expect(wash.backgroundColor).toBe('var(--bg-subtle)');
    expect(wash.backgroundImage).toContain('radial-gradient');
  });
});
