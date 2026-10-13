import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EMBED_CONFIG,
  LIMITS,
  normalizeConfig,
  buildParamPairs,
  buildQuery,
  buildFormUrl,
  buildSnippet,
  buildAdvancedRows,
  triggerAttrs,
  buttonStyle,
  estimateFormHeight,
  publicUrl,
  scriptUrl,
  type EmbedConfig,
} from '@/lib/embed/buildEmbedSnippet';
import type { FormField, FormPage } from '@/types/form';

const ctx = { origin: 'https://app.test', slug: 'my-form', formTitle: 'My "Form" <b>' };
const cfg = (o: Partial<EmbedConfig> = {}): EmbedConfig => ({ ...DEFAULT_EMBED_CONFIG, ...o });

describe('normalizeConfig', () => {
  it('clamps numbers into their limits', () => {
    const n = normalizeConfig(cfg({ widthUnit: 'px', widthValue: 5, height: 99999, modalWidth: 1, drawerWidth: 99999 }));
    expect(n.widthValue).toBe(LIMITS.widthPx[0]);
    expect(n.height).toBe(LIMITS.height[1]);
    expect(n.modalWidth).toBe(LIMITS.modal[0]);
    expect(n.drawerWidth).toBe(LIMITS.drawer[1]);
  });

  it('uses the percent range for % widths and survives NaN', () => {
    expect(normalizeConfig(cfg({ widthUnit: '%', widthValue: 500 })).widthValue).toBe(100);
    expect(normalizeConfig(cfg({ widthUnit: '%', widthValue: NaN })).widthValue).toBe(LIMITS.widthPct[0]);
  });

  it('sanitises button text and colour', () => {
    expect(normalizeConfig(cfg({ buttonText: '  Hi\nthere  ' })).buttonText).toBe('Hi there');
    expect(normalizeConfig(cfg({ buttonText: '   ' })).buttonText).toBe('Open form');
    expect(normalizeConfig(cfg({ buttonText: 'x'.repeat(100) })).buttonText).toHaveLength(LIMITS.buttonText);
    expect(normalizeConfig(cfg({ buttonColor: 'red;}' })).buttonColor).toBe(DEFAULT_EMBED_CONFIG.buttonColor);
    expect(normalizeConfig(cfg({ buttonColor: '#aabbcc' })).buttonColor).toBe('#aabbcc');
  });
});

describe('query building', () => {
  it('emits the base pairs in order', () => {
    expect(buildParamPairs(cfg())).toEqual([
      ['embed', '1'], ['cover', '1'], ['bg', '1'], ['progress', '1'], ['title', '0'], ['theme', 'light'],
    ]);
  });

  it('reflects toggles', () => {
    const q = buildQuery(cfg({ cover: false, background: false, progress: false, hideTitle: true, theme: 'dark' }));
    expect(q).toBe('embed=1&cover=0&bg=0&progress=0&title=1&theme=dark');
  });

  it('includes prefill rows with key and value, skipping blanks, and encodes them', () => {
    const q = buildQuery(cfg({
      prefill: [
        { id: '1', key: ' email ', value: 'a b&c' },
        { id: '2', key: '', value: 'x' },
        { id: '3', key: 'name', value: '  ' },
      ],
    }));
    expect(q).toContain('prefill[email]=a%20b%26c');
    expect(q).not.toContain('prefill[name]');
    expect(q.match(/prefill/g)).toHaveLength(1);
  });

  it('caps prefill rows at the limit', () => {
    const prefill = Array.from({ length: 30 }, (_, i) => ({ id: String(i), key: `k${i}`, value: 'v' }));
    expect(buildParamPairs(cfg({ prefill })).filter(([k]) => k.startsWith('prefill'))).toHaveLength(LIMITS.prefillRows);
  });

  it('builds urls', () => {
    expect(publicUrl(ctx)).toBe('https://app.test/f/my-form');
    expect(scriptUrl(ctx)).toBe('https://app.test/embed.js');
    expect(buildFormUrl(ctx, cfg())).toBe(`https://app.test/f/my-form?${buildQuery(cfg())}`);
  });
});

describe('buildSnippet', () => {
  it('link is just the public URL', () => {
    expect(buildSnippet(ctx, cfg({ method: 'link' }))).toBe('https://app.test/f/my-form');
  });

  it('fixed is an iframe with escaped title, size and fallback link', () => {
    const s = buildSnippet(ctx, cfg({ method: 'fixed', widthUnit: 'px', widthValue: 700, height: 650, border: true, rounded: false }));
    expect(s).toContain('<iframe');
    expect(s).toContain('width="700" height="650"');
    expect(s).toContain('title="My &quot;Form&quot; &lt;b&gt;"');
    expect(s).toContain('border:1px solid #D0D5DD;border-radius:0');
    expect(s).not.toContain('<b>');
    expect(s).toContain('<a href="https://app.test/f/my-form">');
  });

  it('fixed with % width keeps the unit', () => {
    expect(buildSnippet(ctx, cfg({ method: 'fixed', widthUnit: '%', widthValue: 80 }))).toContain('width="80%"');
  });

  it('auto uses the loader script and data attributes', () => {
    const s = buildSnippet(ctx, cfg({ method: 'auto', border: true }));
    expect(s).toContain('data-beginso-form="my-form"');
    expect(s).toContain('data-beginso-border="1"');
    expect(s).toContain('data-beginso-rounded="1"');
    expect(s).toContain('<script src="https://app.test/embed.js" async></script>');
  });

  it('popup and drawer render a trigger button with a noscript fallback', () => {
    const popup = buildSnippet(ctx, cfg({ method: 'popup', buttonText: 'Go <now>' }));
    expect(popup).toContain('data-beginso-popup="my-form"');
    expect(popup).toContain('Go &lt;now&gt;</button>');
    expect(popup).toContain('<noscript>');
    expect(popup).toContain('data-beginso-width="640"');

    const drawer = buildSnippet(ctx, cfg({ method: 'drawer', side: 'left' }));
    expect(drawer).toContain('data-beginso-drawer="my-form"');
    expect(drawer).toContain('data-beginso-side="left"');
    expect(drawer).toContain('data-beginso-width="480"');
  });

  it('falls back to "Form" for an empty title', () => {
    expect(buildSnippet({ ...ctx, formTitle: '' }, cfg({ method: 'auto' }))).toContain('data-beginso-title="Form"');
  });
});

describe('triggerAttrs and buttonStyle', () => {
  it('appends the extra query and omits side for popup', () => {
    const attrs = triggerAttrs(ctx, cfg({ method: 'popup' }), '&preview=1');
    expect(attrs[0]).toEqual(['data-beginso-popup', 'my-form']);
    expect(attrs[1][1].endsWith('&preview=1')).toBe(true);
    expect(attrs.find(([k]) => k === 'data-beginso-side')).toBeUndefined();
  });

  it('picks readable text colour for the button background', () => {
    expect(buttonStyle(cfg({ buttonColor: '#FFFFFF' }))).toContain('color:#111827');
    expect(buttonStyle(cfg({ buttonColor: '#000000' }))).toContain('color:#FFFFFF');
    expect(buttonStyle(cfg({ buttonSize: 'large' }))).toContain('padding:14px 26px');
  });
});

describe('buildAdvancedRows', () => {
  it('is empty for link', () => {
    expect(buildAdvancedRows(cfg({ method: 'link' }))).toEqual([]);
  });

  it('lists URL params then method-specific attributes, ending with params', () => {
    const rows = buildAdvancedRows(cfg({ method: 'auto' }));
    expect(rows.slice(0, 6).map((r) => r.name)).toEqual(['embed', 'cover', 'bg', 'progress', 'title', 'theme']);
    expect(rows.map((r) => r.name)).toContain('data-beginso-border');
    expect(rows[rows.length - 1].name).toBe('data-beginso-params');
  });

  it('adds prefill rows and drawer side', () => {
    const rows = buildAdvancedRows(cfg({ method: 'drawer', prefill: [{ id: '1', key: 'a', value: 'b' }] }));
    expect(rows.find((r) => r.name === 'prefill[a]')?.value).toBe('b');
    expect(rows.map((r) => r.name)).toContain('data-beginso-side');
  });

  it('fixed lists width / height', () => {
    const rows = buildAdvancedRows(cfg({ method: 'fixed', widthUnit: 'px', widthValue: 600, height: 400 }));
    expect(rows.find((r) => r.name === 'width / height')?.value).toBe('600px / 400px');
  });
});

describe('estimateFormHeight', () => {
  const pages = [{ id: 'p1', title: 'P1' }, { id: 'p2', title: 'P2', description: 'd' }] as unknown as FormPage[];
  const f = (o: Record<string, unknown>) => ({ id: 'x', pageId: 'p1', type: 'short_text', ...o }) as unknown as FormField;

  it('is larger with a cover and a progress bar', () => {
    const fields = [f({})];
    const base = estimateFormHeight(fields, pages, { cover: false, progress: false });
    expect(estimateFormHeight(fields, pages, { cover: true, progress: false })).toBe(base + 168);
    expect(estimateFormHeight(fields, pages, { cover: false, progress: true })).toBe(base + 32);
  });

  it('ignores deleted fields and takes the tallest page', () => {
    const none = estimateFormHeight([f({ deleted: true })], pages, { cover: false, progress: false });
    const tall = estimateFormHeight([f({ type: 'long_text' }), f({ type: 'long_text' }), f({ pageId: 'p2' })], pages, { cover: false, progress: false });
    expect(tall).toBeGreaterThan(none);
    expect(tall - none).toBe(150 + 20 + 150 + 20 - 28); // empty page 2 still carries its 28px description
  });

  it('grows with choice options', () => {
    const small = estimateFormHeight([f({ type: 'checkbox', options: ['a'] })], pages, { cover: false, progress: false });
    const big = estimateFormHeight([f({ type: 'checkbox', options: ['a', 'b', 'c'] })], pages, { cover: false, progress: false });
    expect(big - small).toBe(76);
  });
});
