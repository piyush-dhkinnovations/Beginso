import { describe, it, expect, afterEach, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { BLOG_POSTS } from '@/lib/blogPosts';

afterEach(() => vi.unstubAllEnvs());

describe('robots.txt and sitemap.xml (QA: both returned 404)', () => {
  it('robots keeps the signed-in app, API and per-form pages out, and points at the sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beginso.com');
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(expect.arrayContaining(['/dashboard', '/forms', '/settings', '/w/', '/api/']));
    expect(r.sitemap).toBe('https://www.beginso.com/sitemap.xml');
  });

  // QA D1-005: the signed-in routes added since the first list were missing from it.
  it('robots disallows every signed-in route, and none of the public pages the sitemap lists', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const disallow = rule.disallow as string[];
    for (const route of ['/insights', '/inbox', '/exports', '/form-responses', '/my-submissions', '/shared', '/trash', '/search', '/notifications', '/workspaces', '/templates']) {
      expect(disallow).toContain(route);
    }
    const blocked = (url: string) => disallow.some((d) => new URL(url, 'https://x.test').pathname.startsWith(d));
    for (const e of sitemap()) expect(blocked(e.url)).toBe(false);
  });

  it('sitemap lists the public pages and every blog post on the canonical origin, and nothing signed-in', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beginso.com');
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain('https://www.beginso.com');
    expect(urls).toContain('https://www.beginso.com/terms');
    for (const p of BLOG_POSTS) expect(urls).toContain(`https://www.beginso.com/blog/${p.slug}`);
    expect(urls.some((u) => /\/(dashboard|forms|settings|w)\b/.test(u))).toBe(false);
  });
});
