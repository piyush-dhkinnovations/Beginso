import { describe, it, expect } from 'vitest';
import {
  parseEmbedOptions,
  carryEmbedSearch,
  clampHeight,
  originOf,
  knownEmbedderOrigin,
  parseHello,
  EMBED_MSG,
  MIN_EMBED_HEIGHT,
  MAX_EMBED_HEIGHT,
} from '@/lib/embed/embedParams';

describe('parseEmbedOptions', () => {
  it('has safe defaults for an empty query', () => {
    expect(parseEmbedOptions('')).toEqual({
      embed: false, preview: false, cover: true, background: true, progress: true, hideTitle: false, theme: 'light', prefill: {},
    });
  });

  it('reads flags', () => {
    const o = parseEmbedOptions('?embed=1&preview=1&cover=0&bg=0&progress=0&title=1&theme=dark');
    expect(o).toMatchObject({ embed: true, preview: true, cover: false, background: false, progress: false, hideTitle: true, theme: 'dark' });
  });

  it('accepts auto theme and rejects unknown themes', () => {
    expect(parseEmbedOptions('theme=auto').theme).toBe('auto');
    expect(parseEmbedOptions('theme=neon').theme).toBe('light');
  });

  it('collects prefill[key] values, truncating long values', () => {
    const o = parseEmbedOptions(`prefill[email]=a%40b.co&prefill[x]=${'y'.repeat(2500)}&other=1`);
    expect(o.prefill.email).toBe('a@b.co');
    expect(o.prefill.x).toHaveLength(2000);
    expect(Object.keys(o.prefill)).toEqual(['email', 'x']);
  });

  it('caps prefill at 50 keys', () => {
    const q = Array.from({ length: 60 }, (_, i) => `prefill[k${i}]=v`).join('&');
    expect(Object.keys(parseEmbedOptions(q).prefill)).toHaveLength(50);
  });

  it('ignores over-long prefill keys', () => {
    expect(parseEmbedOptions(`prefill[${'k'.repeat(101)}]=v`).prefill).toEqual({});
  });
});

describe('carryEmbedSearch', () => {
  it('keeps only embed, theme and bg', () => {
    expect(carryEmbedSearch('?embed=1&theme=dark&bg=0&cover=0&prefill[a]=b')).toBe('embed=1&theme=dark&bg=0');
  });
  it('returns empty for nothing to carry', () => {
    expect(carryEmbedSearch('cover=0')).toBe('');
  });
});

describe('clampHeight', () => {
  it('rounds up and clamps', () => {
    expect(clampHeight(500.2)).toBe(501);
    expect(clampHeight(5)).toBe(MIN_EMBED_HEIGHT);
    expect(clampHeight(1e9)).toBe(MAX_EMBED_HEIGHT);
  });
  it('rejects non-finite or non-number input', () => {
    expect(clampHeight('500')).toBeNull();
    expect(clampHeight(NaN)).toBeNull();
    expect(clampHeight(Infinity)).toBeNull();
    expect(clampHeight(undefined)).toBeNull();
  });
});

describe('origins', () => {
  it('originOf extracts the origin and tolerates bad input', () => {
    expect(originOf('https://example.com/a/b?c=1')).toBe('https://example.com');
    expect(originOf('not a url')).toBeNull();
    expect(originOf('')).toBeNull();
    expect(originOf(null)).toBeNull();
    expect(originOf('data:text/plain,hi')).toBeNull();
  });

  it('knownEmbedderOrigin prefers ancestorOrigins then referrer', () => {
    expect(knownEmbedderOrigin(['https://a.com'], 'https://b.com/x')).toBe('https://a.com');
    expect(knownEmbedderOrigin(undefined, 'https://b.com/x')).toBe('https://b.com');
    expect(knownEmbedderOrigin([], '')).toBeNull();
  });
});

describe('parseHello', () => {
  it('accepts a well-formed hello', () => {
    expect(parseHello({ type: EMBED_MSG.hello, scheme: 'dark', autoHeight: true })).toEqual({ scheme: 'dark', autoHeight: true });
  });
  it('nulls an unknown scheme and non-true autoHeight', () => {
    expect(parseHello({ type: EMBED_MSG.hello, scheme: 'blue', autoHeight: 'yes' })).toEqual({ scheme: null, autoHeight: false });
  });
  it('ignores malformed messages', () => {
    expect(parseHello(null)).toBeNull();
    expect(parseHello('beginso:hello')).toBeNull();
    expect(parseHello({ type: 'other' })).toBeNull();
  });
});
