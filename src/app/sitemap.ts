import type { MetadataRoute } from 'next';
import { publicOrigin } from '@/lib/publicFormUrl';
import { BLOG_POSTS } from '@/lib/blogPosts';

const STATIC_PAGES = [
  '/',
  '/blog',
  '/discover-templates',
  '/try',
  '/terms',
  '/privacy',
  '/cookie-policy',
  '/acceptable-use-policy',
  '/fair-use-policy',
  '/data-processing-agreement',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin) return [];
  return [
    ...STATIC_PAGES.map((path) => ({ url: `${origin}${path === '/' ? '' : path}` })),
    ...BLOG_POSTS.map((post) => ({ url: `${origin}/blog/${post.slug}`, lastModified: post.date })),
  ];
}
