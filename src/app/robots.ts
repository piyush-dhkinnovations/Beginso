import type { MetadataRoute } from 'next';
import { publicOrigin } from '@/lib/publicFormUrl';

// Public marketing pages are crawlable; the signed-in app, workspaces, the API and the per-form public
// pages (/f/, one-off respondent links) are not.
export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Every signed-in route (they redirect to /login when signed out) plus the API and per-form public pages.
      disallow: [
        '/dashboard', '/forms', '/settings', '/w/', '/api/', '/f/', '/r/', '/invite/',
        '/insights', '/inbox', '/exports', '/responses', '/form-responses', '/analytics', '/reports', '/shared', '/trash',
        '/search', '/notifications', '/workspaces', '/my-submissions', '/onboarding', '/templates',
      ],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml`, host: origin } : {}),
  };
}
