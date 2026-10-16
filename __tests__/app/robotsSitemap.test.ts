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

  it('sitemap lists the public pages and every blog post on the canonical origin, and nothing signed-in', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beginso.com');
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain('https://www.beginso.com');
    expect(urls).toContain('https://www.beginso.com/terms');
    for (const p of BLOG_POSTS) expect(urls).toContain(`https://www.beginso.com/blog/${p.slug}`);
    expect(urls.some((u) => /\/(dashboard|forms|settings|w)\b/.test(u))).toBe(false);
  });
});
