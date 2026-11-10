import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe('security headers', () => {
  it('allows the Firebase Google sign-in bootstrap without weakening popup isolation', async () => {
    const getHeaders = nextConfig.headers as (() => Promise<HeaderRule[]>) | undefined;
    expect(getHeaders).toBeTypeOf('function');

    const rules = await getHeaders!();
    // The blanket rule excludes /dev/ui/frame (sprint-7-foundation's /dev/ui gallery preview —
    // see next.config.ts's own comment) rather than matching literally everything, so this
    // finds it by its header content, not the exact source string.
    const headers = rules.find((rule) =>
      rule.headers.some((h) => h.key === 'Content-Security-Policy' && h.value.includes("frame-ancestors 'none'"))
    )?.headers;
    const headerValue = (key: string) => headers?.find((header) => header.key === key)?.value;
    const csp = headerValue('Content-Security-Policy');

    expect(csp).toContain('https://apis.google.com');
    expect(csp).toContain('https://accounts.google.com');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headerValue('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
  });

  it('relaxes frame-ancestors to same-origin only for the /dev/ui gallery preview iframe', async () => {
    const getHeaders = nextConfig.headers as (() => Promise<HeaderRule[]>) | undefined;
    const rules = await getHeaders!();
    const frameRule = rules.find((rule) => rule.source === '/dev/ui/frame');
    const headerValue = (key: string) => frameRule?.headers.find((header) => header.key === key)?.value;

    expect(frameRule).toBeDefined();
    expect(headerValue('Content-Security-Policy')).toContain("frame-ancestors 'self'");
    expect(headerValue('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('allows the template detail page to embed its own device-preview route in a same-origin iframe', async () => {
    const getHeaders = nextConfig.headers as (() => Promise<HeaderRule[]>) | undefined;
    const rules = await getHeaders!();
    const frameRule = rules.find((rule) => rule.source === '/discover-templates/:slug/preview');
    const headerValue = (key: string) => frameRule?.headers.find((header) => header.key === key)?.value;

    expect(frameRule).toBeDefined();
    expect(headerValue('Content-Security-Policy')).toContain("frame-ancestors 'self'");
    expect(headerValue('X-Frame-Options')).toBe('SAMEORIGIN');

    // The blanket rule's own negative lookahead must also exclude this path, or CSP's "multiple
    // matching rules combine by intersection" (next.config.ts's own comment) would silently
    // re-tighten it back to frame-ancestors 'none'. The catch-all is the one rule whose source is
    // itself a regex (starts with the negative-lookahead group), not the other, more specific
    // rules (like /r/:path*) that also happen to carry frame-ancestors 'none'.
    const blanket = rules.find((rule) => rule.source.startsWith('/((?!'));
    expect(blanket?.source).toContain('discover-templates');
  });

  it('serves static art with a day of caching and no X-Powered-By (these were revalidated on every load)', async () => {
    const rules = await (nextConfig.headers as () => Promise<HeaderRule[]>)();
    const cacheOf = (source: string) => rules.find((r) => r.source === source)?.headers.find((h) => h.key === 'Cache-Control')?.value;
    for (const source of ['/favicon.svg', '/favicon-light.svg', '/favicon-dark.svg', '/name-light.svg', '/name-dark.svg', '/avatars/:path*', '/blog/covers/:path*', '/email/:path*']) {
      expect(cacheOf(source), source).toMatch(/max-age=86400/);
    }
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
