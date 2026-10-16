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
      disallow: ['/dashboard', '/forms', '/settings', '/w/', '/api/', '/f/', '/r/', '/invite/'],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml`, host: origin } : {}),
  };
}
