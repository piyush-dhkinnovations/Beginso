/**
 * branding.theme: colours, fields look and exact sizes. One code path (brandLookProps) draws it for the public form, the preview and the studio's tiles;
 * a form with no theme gets nothing from it.
 */
import { describe, it, expect } from 'vitest';
import { brandButtonStyle, brandLookProps, cleanTheme, cardShadowValue, effectiveTheme, patchTheme, themeOptionBlocked } from '@/lib/formTheme';
import { contrastRatio, fixContrast } from '@/lib/contrast';
import { sanitizeBranding, sanitizeTheme } from '@/services/forms';
import { LAYOUT_LOOKS, lookBranding } from '@/lib/layoutPresets';
import type { FormBranding, FormTheme, LayoutPreset } from '@/types/form';

const FULL: FormTheme = {
  v: 1,
  colors: { text: '#111827', heading: '#7C3AED', card: '#FFFFFF', field: '#F3F4F6', fieldBorder: '#6B7280', buttonText: '#000000' },
  fields: { style: 'underline', radius: 12, label: 'start', choice: 'tiles' },
  card: { radius: 24, shadow: 60 },
  layout: { maxWidth: 900, fieldGap: 20 },
};

describe('a form with no theme is drawn as it always was', () => {
  it.each([undefined, null, { v: 1 as const }, { v: 1 as const, fields: {}, colors: {} }])('brandLookProps(%j) adds no style and no data attribute', (theme) => {
    const { className, style, ...attrs } = brandLookProps({ theme });
    expect(className).toBe('form-look');
    expect(style).toEqual({});
    expect(Object.values(attrs).filter((v) => v !== undefined)).toEqual([]);
  });

  it('the button is white on the brand colour unless a button text colour is chosen', () => {
    expect(brandButtonStyle({})).toMatchObject({ color: '#FFFFFF' });
    expect(brandButtonStyle({ theme: { v: 1, colors: { buttonText: '#000000' } } })).toMatchObject({ color: '#000000' });
    expect(brandButtonStyle({ buttonStyle: 'outline', primaryColor: '#ff0000', theme: { v: 1, colors: { buttonText: '#000000' } } })).toMatchObject({ color: '#ff0000' });
  });

  it('the exact-value switches are off for the chosen looks of today (outlined, above, plain)', () => {
    const attrs = brandLookProps({ theme: { v: 1, fields: { style: 'outlined', label: 'above', choice: 'plain' } } });
    expect(attrs['data-field-style']).toBeUndefined();
    expect(attrs['data-label-start']).toBeUndefined();
    expect(attrs['data-choice-tiles']).toBeUndefined();
  });
});

describe('brandLookProps with a theme', () => {
  const { style, ...attrs } = brandLookProps({ theme: FULL });
  const s = style as Record<string, string>;

  it('turns colours into the custom properties the form already reads', () => {
    expect(s['--text-primary']).toBe('#111827');
    expect(s['--form-heading']).toBe('#7C3AED');
    expect(s['--surface-card']).toBe('#FFFFFF');
    expect(s['--form-field-bg']).toBe('#F3F4F6');
    expect(s['--form-field-border']).toBe('#6B7280');
    expect(s['--form-field-edge']).toBe('#6B7280');
  });

  it('turns exact sizes into px values', () => {
    expect(s['--form-field-radius']).toBe('12px');
    expect(s['--form-card-radius']).toBe('24px');
    expect(s['--form-max-width']).toBe('900px');
    expect(s['--form-field-gap']).toBe('20px');
    expect(s['--form-card-shadow']).toBe(cardShadowValue(60));
  });

  it('switches the look on with data attributes', () => {
    expect(attrs).toMatchObject({ 'data-field-style': 'underline', 'data-label-start': '', 'data-choice-tiles': '', 'data-card-radius': '', 'data-card-shadow': '', 'data-max-width': '', 'data-field-gap': '' });
  });

  it('keeps a visible edge for filled and underline fields from the text colour when no border colour is set', () => {
    const edge = (brandLookProps({ theme: { v: 1, colors: { text: '#111827' } } }).style as Record<string, string>)['--form-field-edge'];
    expect(edge).toContain('#111827');
    expect(edge).not.toContain('transparent');
  });

  it('a shadow of 0 is none and 100 is deeper than 50', () => {
    expect(cardShadowValue(0)).toBe('none');
    expect(cardShadowValue(100)).not.toBe(cardShadowValue(50));
  });
});

describe('what a layout can show', () => {
  it.each<[LayoutPreset, boolean]>([['classic', false], ['card_stack', false], ['steps', false], ['split_feature', false], ['guided', true], ['compact', true]])('label beside the field, %s: blocked = %s', (layout, blocked) => {
    expect(!!themeOptionBlocked('labelPosition', layout)).toBe(blocked);
  });

  it('say why, never silently', () => {
    expect(themeOptionBlocked('labelPosition', 'guided')).toMatch(/one question/);
    expect(themeOptionBlocked('fieldRadius', 'classic', { v: 1, fields: { style: 'underline' } })).toMatch(/no corners/);
    expect(themeOptionBlocked('fieldRadius', 'classic', { v: 1, fields: { style: 'filled' } })).toBeUndefined();
  });

  it('effectiveTheme leaves out what the layout cannot draw and keeps the rest', () => {
    const t = effectiveTheme('guided', FULL)!;
    expect(t.fields?.label).toBeUndefined();
    expect(t.fields?.radius).toBeUndefined(); // underline has no corners
    expect(t.fields?.choice).toBe('tiles');
    expect(t.colors).toEqual(FULL.colors);
    expect(effectiveTheme('classic', { v: 1, fields: { label: 'start', style: 'filled', radius: 4 } })?.fields).toEqual({ label: 'start', style: 'filled', radius: 4 });
    expect(effectiveTheme('classic', undefined)).toBeUndefined();
    expect(effectiveTheme('classic', null)).toBeUndefined();
  });
});

describe('patchTheme', () => {
  it('sets one key and keeps the others', () => {
    expect(patchTheme(null, 'card', { radius: 8 })).toEqual({ v: 1, card: { radius: 8 } });
    expect(patchTheme({ v: 1, card: { radius: 8 } }, 'card', { shadow: 10 })).toEqual({ v: 1, card: { radius: 8, shadow: 10 } });
  });

  it('removes an emptied group, and an emptied theme (null), so the form goes back to having none', () => {
    expect(patchTheme({ v: 1, card: { radius: 8 }, layout: { fieldGap: 8 } }, 'card', { radius: undefined })).toEqual({ v: 1, layout: { fieldGap: 8 } });
    expect(patchTheme({ v: 1, card: { radius: 8 } }, 'card', { radius: undefined })).toBeNull();
  });

  it('does not change the theme it is given', () => {
    const t: FormTheme = { v: 1, card: { radius: 8 } };
    patchTheme(t, 'card', { radius: 9 });
    expect(t).toEqual({ v: 1, card: { radius: 8 } });
  });
});

describe('contrast', () => {
  it('measures black on white as 21 and a colour on itself as 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#1D4ED8', '#1D4ED8')).toBeCloseTo(1, 5);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 0);
    expect(contrastRatio('red', '#000')).toBeNull();
  });

  it.each([
    ['#9CA3AF', '#FFFFFF', 4.5],
    ['#DDE1EA', '#FFFFFF', 3],
    ['#FFFF00', '#FFFFFF', 4.5],
    ['#777777', '#111111', 4.5],
  ])('fixContrast(%s on %s, %s) reaches the ratio', (fg, bg, min) => {
    const fixed = fixContrast(fg, bg, min)!;
    expect(contrastRatio(fixed, bg)!).toBeGreaterThanOrEqual(min);
  });

  it('moves the colour as little as it can and keeps one that already passes', () => {
    expect(fixContrast('#000000', '#FFFFFF', 4.5)).toBe('#000000');
    const fixed = fixContrast('#7C3AED', '#FFFFFF', 7)!;
    expect(contrastRatio(fixed, '#FFFFFF')!).toBeGreaterThanOrEqual(7);
    expect(fixed).not.toBe('#000000');
  });

  it('returns black or white when nothing else can reach it, and null for a non-colour', () => {
    expect(['#000000', '#FFFFFF']).toContain(fixContrast('#808080', '#777777', 21));
    expect(fixContrast('red', '#FFF', 4.5)).toBeNull();
  });
});

describe('what a save sends', () => {
  it('keeps a valid theme, and nothing else of one', () => {
    expect(sanitizeTheme(FULL)).toEqual(FULL);
    expect(sanitizeTheme({ v: 1, colors: { text: 'red', heading: '#fff' }, card: { radius: 41, shadow: 3.5 }, junk: 1, fields: { style: 'glass', radius: 5 } })).toEqual({ v: 1, colors: { heading: '#fff' }, fields: { radius: 5 } });
    expect(sanitizeTheme({ v: 1, colors: { text: 'red' } })).toBeUndefined();
    expect(sanitizeTheme('x')).toBeUndefined();
    expect(sanitizeTheme(null)).toBeUndefined();
  });

  it('puts the theme in the branding body, sends null to clear it, and sends nothing for a form that has none', () => {
    expect(sanitizeBranding({ primaryColor: '#1D4ED8', theme: FULL }).theme).toEqual(FULL);
    expect(sanitizeBranding({ theme: null })).toEqual({ theme: null });
    expect('theme' in sanitizeBranding({ primaryColor: '#1D4ED8' })).toBe(false);
    expect('theme' in sanitizeBranding({ theme: { v: 1, card: { radius: 999 } } })).toBe(false);
  });
});

describe('switching layout does not undo a design the owner made', () => {
  const classic = LAYOUT_LOOKS.classic;
  const fresh: FormBranding = { primaryColor: classic.color, fontFamily: classic.font, cardStyle: classic.cardStyle, panelTreatment: classic.panel, backgroundStyle: classic.background };

  it('a form still wearing its layout\'s own look gets the whole look of the new layout', () => {
    expect(lookBranding('steps', fresh, false, 'classic')).toEqual({ fontFamily: 'work_sans', cardStyle: 'soft', panelTreatment: 'pattern', backgroundStyle: 'dots', backgroundColor: undefined, primaryColor: LAYOUT_LOOKS.steps.color });
  });

  it('keeps the font, card, panel and background the owner changed, and the colour they chose', () => {
    const own: FormBranding = { ...fresh, fontFamily: 'lora', cardStyle: 'flat', panelTreatment: 'gradient', backgroundStyle: 'grid', primaryColor: '#16A34A' };
    expect(lookBranding('steps', own, false, 'classic')).toEqual({});
  });

  it('changes only what the owner left alone', () => {
    const some: FormBranding = { ...fresh, fontFamily: 'nunito', primaryColor: '#16A34A' };
    expect(lookBranding('card_stack', some, false, 'classic')).toEqual({ cardStyle: 'bordered', panelTreatment: 'solid', backgroundStyle: 'grid', backgroundColor: undefined });
  });

  it('a form with nothing chosen yet follows the layout', () => {
    expect(lookBranding('guided', {}, false, 'classic')).toMatchObject({ fontFamily: 'nunito', cardStyle: 'elevated', primaryColor: LAYOUT_LOOKS.guided.color });
  });

  it('without the current layout it behaves as before (the gallery and the guest designer)', () => {
    expect(lookBranding('steps', { primaryColor: '#16A34A', fontFamily: 'lora' })).toMatchObject({ fontFamily: 'work_sans', cardStyle: 'soft' });
    expect(lookBranding('steps', { primaryColor: '#16A34A' }, true).primaryColor).toBe(LAYOUT_LOOKS.steps.color);
  });

  it('changing a design property never changes the layout (the setters take no layout)', () => {
    const t = patchTheme(null, 'card', { radius: 8 });
    expect(t).toEqual({ v: 1, card: { radius: 8 } });
  });
});

describe('the theme is re-checked before it becomes CSS', () => {
  const hostile = {
    v: 1,
    colors: { text: 'red; background:url(//evil.example/x)', heading: '#12', card: 'url(javascript:1)', field: '#FFF}body{display:none', fieldBorder: 123, buttonText: '#FFFFFFF' },
    fields: { style: 'glass', radius: '12px', label: 'inside', choice: 'cards' },
    card: { radius: 3.5, shadow: 101 },
    layout: { maxWidth: 99999, fieldGap: -4 },
  };

  it('drops every bad value, keeps nothing, and the look has no style and no attribute', () => {
    expect(cleanTheme(hostile)).toBeUndefined();
    const { className, style, ...attrs } = brandLookProps({ theme: hostile as unknown as FormTheme });
    expect(className).toBe('form-look');
    expect(style).toEqual({});
    expect(Object.values(attrs).filter((v) => v !== undefined)).toEqual([]);
  });

  it('keeps the good values next to bad ones, and never lets a raw string into a style', () => {
    const mixed = { v: 1, colors: { text: '#222222', heading: 'x;y' }, card: { radius: 16, shadow: 'a' }, fields: { style: 'filled', label: 'start' } };
    const { style } = brandLookProps({ theme: mixed as unknown as FormTheme });
    expect(Object.values(style as Record<string, string>).every((v) => /^(#[0-9A-Fa-f]{3,6}|color-mix\(in srgb, #222222 \d+%, (transparent|var\(--surface-card\))\)|\d+px)$/.test(v))).toBe(true);
    expect((style as Record<string, string>)['--form-heading']).toBeUndefined();
  });

  it.each([[{ v: 2, card: { radius: 8 } }], [{ card: { radius: 8 } }], ['x'], [7], [[]], [null], [undefined]])('ignores a theme that is not version 1: %j', (raw) => {
    expect(cleanTheme(raw)).toBeUndefined();
  });

  it('the button text colour is checked too', () => {
    expect(brandButtonStyle({ theme: { v: 1, colors: { buttonText: 'red;x' } } as unknown as FormTheme })).toMatchObject({ color: '#FFFFFF' });
  });

  it('effectiveTheme cleans before it filters', () => {
    expect(effectiveTheme('classic', { v: 1, fields: { label: 'inside' } } as unknown as FormTheme)).toBeUndefined();
  });
});
