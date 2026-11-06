/**
 * The typefaces a form can use and the heading font: the list matches the backend's, every typeface is really loaded by the root layout, and a
 * heading font reaches the CSS only when it is a known one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { FONT_GROUPS, FORM_FONT_OPTIONS, brandLookProps, brandTypeStyle, cleanTheme, effectiveTheme, patchTheme } from '@/lib/formTheme';
import { sanitizeBranding, sanitizeTheme } from '@/services/forms';
import type { FormFont, FormTheme } from '@/types/form';

// The same list as FORM_FONTS in the backend's models/Form.ts (a change there is a change here).
const BACKEND_FONTS = [
  'dm_sans', 'inter', 'work_sans', 'lora', 'nunito',
  'poppins', 'manrope', 'plus_jakarta_sans', 'outfit', 'space_grotesk', 'montserrat',
  'playfair_display', 'merriweather', 'source_serif_4', 'fraunces', 'dm_serif_display',
  'quicksand', 'fredoka',
  'caveat', 'pacifico', 'bebas_neue', 'space_mono',
];

describe('the font list', () => {
  it('is the backend list, in the same order', () => {
    expect(FORM_FONT_OPTIONS.map((f) => f.value)).toEqual(BACKEND_FONTS);
  });

  it('has a unique id and label, a known group, and a stack that falls back to a system face', () => {
    const groups = FONT_GROUPS.map((g) => g.id);
    expect(new Set(FORM_FONT_OPTIONS.map((f) => f.value)).size).toBe(FORM_FONT_OPTIONS.length);
    expect(new Set(FORM_FONT_OPTIONS.map((f) => f.label)).size).toBe(FORM_FONT_OPTIONS.length);
    for (const f of FORM_FONT_OPTIONS) {
      expect(groups).toContain(f.group);
      expect(f.stack).toMatch(/^var\(--font-[a-z0-9-]+\), [^;]+$/);
    }
    for (const g of groups) expect(FORM_FONT_OPTIONS.some((f) => f.group === g)).toBe(true);
  });

  it('has every typeface loaded by the root layout under the variable its stack uses', () => {
    const layout = fs.readFileSync(path.join(__dirname, '../../src/app/layout.tsx'), 'utf8');
    for (const f of FORM_FONT_OPTIONS) {
      const variable = /var\((--font-[a-z0-9-]+)\)/.exec(f.stack)![1];
      expect(layout, `${f.value} is loaded as ${variable}`).toContain(`"${variable}"`);
    }
  });

  it('the body font becomes the whole form font through the design system variable', () => {
    const style = brandTypeStyle({ fontFamily: 'playfair_display' }) as Record<string, string>;
    expect(style['--bg-font-sans']).toBe(FORM_FONT_OPTIONS.find((f) => f.value === 'playfair_display')!.stack);
  });
});

describe('the heading font', () => {
  it('is cleaned like the rest of the theme: only a known typeface stays', () => {
    expect(cleanTheme({ v: 1, fonts: { heading: 'caveat' } })).toEqual({ v: 1, fonts: { heading: 'caveat' } });
    for (const bad of ['comic_sans', 'Caveat', 'caveat; x', '', 7, null, {}]) {
      expect(cleanTheme({ v: 1, fonts: { heading: bad } })).toBeUndefined();
    }
    expect(cleanTheme({ v: 1, fonts: { heading: 'caveat', weight: 900 } })).toEqual({ v: 1, fonts: { heading: 'caveat' } });
  });

  it('adds one custom property and one switch, and nothing for a form without one', () => {
    const { style, ...attrs } = brandLookProps({ theme: { v: 1, fonts: { heading: 'playfair_display' } } });
    expect((style as Record<string, string>)['--form-heading-font']).toBe(FORM_FONT_OPTIONS.find((f) => f.value === 'playfair_display')!.stack);
    expect(attrs['data-heading-font']).toBe('');
    const none = brandLookProps({ theme: { v: 1, card: { radius: 8 } } });
    expect((none.style as Record<string, string>)['--form-heading-font']).toBeUndefined();
    expect(none['data-heading-font']).toBeUndefined();
  });

  it('survives a layout filter, and patchTheme sets and clears it', () => {
    const t: FormTheme = { v: 1, fonts: { heading: 'fraunces' } };
    expect(effectiveTheme('guided', t)?.fonts).toEqual({ heading: 'fraunces' });
    expect(patchTheme(null, 'fonts', { heading: 'fraunces' })).toEqual(t);
    expect(patchTheme(t, 'fonts', { heading: undefined })).toBeNull();
  });

  it('is sent on a save, and a font the server does not know is not', () => {
    expect(sanitizeTheme({ v: 1, fonts: { heading: 'outfit' } })).toEqual({ v: 1, fonts: { heading: 'outfit' } });
    expect(sanitizeBranding({ theme: { v: 1, fonts: { heading: 'outfit' } } }).theme).toEqual({ v: 1, fonts: { heading: 'outfit' } });
    expect('theme' in sanitizeBranding({ theme: { v: 1, fonts: { heading: 'nope' } } })).toBe(false);
  });

  it('the save path accepts every new body font and refuses an unknown one', () => {
    for (const f of BACKEND_FONTS) expect(sanitizeBranding({ fontFamily: f }).fontFamily).toBe(f);
    expect(sanitizeBranding({ fontFamily: 'comic_sans' }).fontFamily).toBeUndefined();
  });

  it('every font id is a FormFont', () => {
    const ids: FormFont[] = FORM_FONT_OPTIONS.map((f) => f.value);
    expect(ids).toHaveLength(22);
  });
});
