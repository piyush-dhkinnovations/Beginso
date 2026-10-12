// Embed protocol + URL parameters, form-page side. Pure (no DOM at import time) so the same rules are
// unit-checkable. The vanilla script in public/embed.js duplicates the message names and the height clamp
// on purpose (it cannot import); keep both in step. Parameters are documented in docs/backend-contract/api-reference.md.
export const EMBED_MSG = { hello: 'beginso:hello', height: 'beginso:height', escape: 'beginso:escape' } as const;
export const MIN_EMBED_HEIGHT = 120;
export const MAX_EMBED_HEIGHT = 20000;

export type EmbedTheme = 'light' | 'dark' | 'auto';
export type Scheme = 'light' | 'dark';

export interface EmbedOptions {
  /** ?embed=1 — chrome-less, reports its height to the embedder. */
  embed: boolean;
  /** ?preview=1 - the builder's own preview frame: nothing is submitted or counted as a view. */
  preview: boolean;
  /** ?cover=0|1 (default 1) */
  cover: boolean;
  /** ?bg=0|1 (default 1): 0 drops the page background behind the form card, so the host page shows through. */
  background: boolean;
  /** ?progress=0|1 (default 1) */
  progress: boolean;
  /** ?title=1 hides the form title (default 0). */
  hideTitle: boolean;
  /** ?theme=light|dark|auto (default light — the form's own theme). */
  theme: EmbedTheme;
  /** ?prefill[key]=value, raw (validated per field by resolvePrefill). */
  prefill: Record<string, string>;
}

export function parseEmbedOptions(search: string): EmbedOptions {
  const p = new URLSearchParams(search);
  const theme = p.get('theme');
  const prefill: Record<string, string> = {};
  for (const [k, v] of p.entries()) {
    const m = /^prefill\[(.{1,100})\]$/.exec(k);
    if (m && Object.keys(prefill).length < 50) prefill[m[1]] = v.slice(0, 2000);
  }
  return {
    embed: p.get('embed') === '1',
    preview: p.get('preview') === '1',
    cover: p.get('cover') !== '0',
    background: p.get('bg') !== '0',
    progress: p.get('progress') !== '0',
    hideTitle: p.get('title') === '1',
    theme: theme === 'dark' || theme === 'auto' ? theme : 'light',
    prefill,
  };
}

/** Parameters that must survive the submit -> success navigation inside the frame. */
export function carryEmbedSearch(search: string): string {
  const p = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of ['embed', 'theme', 'bg']) if (p.has(k)) out.set(k, p.get(k)!);
  return out.toString();
}

export function clampHeight(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(MAX_EMBED_HEIGHT, Math.max(MIN_EMBED_HEIGHT, Math.ceil(n)));
}

export function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const o = new URL(url).origin;
    return o === 'null' ? null : o;
  } catch {
    return null;
  }
}

/** The embedder's origin when the browser tells us (ancestorOrigins, else the referrer). Never guessed. */
export function knownEmbedderOrigin(ancestorOrigins: ArrayLike<string> | undefined, referrer: string): string | null {
  return originOf(ancestorOrigins?.[0]) ?? originOf(referrer);
}

/** A well-formed hello from the embedder script, or null (malformed messages are ignored). */
export function parseHello(data: unknown): { scheme: Scheme | null; autoHeight: boolean } | null {
  if (!data || typeof data !== 'object' || (data as { type?: unknown }).type !== EMBED_MSG.hello) return null;
  const s = (data as { scheme?: unknown }).scheme;
  return { scheme: s === 'dark' || s === 'light' ? s : null, autoHeight: (data as { autoHeight?: unknown }).autoHeight === true };
}
