import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { GalleryData } from '@/lib/templateGallery';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/landing/Navbar', () => ({ default: () => null }));
vi.mock('@/components/landing/Footer', () => ({ default: () => null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => ({ data: undefined, isLoading: false, error: null }) }));

const fetchGallery = vi.fn();
vi.mock('@/services/templateGalleryServer', () => ({ fetchGallery: () => fetchGallery() }));

import DiscoverTemplatesPage, { generateMetadata } from '@/app/discover-templates/page';
import { DISCOVER_DESCRIPTION, DISCOVER_TITLE } from '@/lib/templateGallery';

const DATA: GalleryData = {
  cards: [
    { slug: 'job-application', name: 'Job Application', description: 'Collect CVs.', category: 'HR & Hiring', tags: [], fieldCount: 6, estimatedMinutes: 3, featured: false, sortOrder: 1, layout: 'classic', thumbnail: null },
    { slug: 'wedding-rsvp', name: 'Wedding RSVP', description: 'A wedding RSVP.', category: 'Events & RSVPs', tags: [], fieldCount: 4, estimatedMinutes: 2, featured: false, sortOrder: 2, layout: 'classic', thumbnail: null },
  ],
  groups: [
    { name: 'HR & Hiring', count: 1 },
    { name: 'Events & RSVPs', count: 1 },
  ],
};

beforeEach(() => {
  fetchGallery.mockReset();
});

describe('the gallery page: head', () => {
  it('has a real description (not the placeholder) and Open Graph and Twitter tags', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.beginso.com');
    const meta = generateMetadata();
    vi.unstubAllEnvs();
    expect(meta.title).toBe(DISCOVER_TITLE);
    expect(meta.description).toBe(DISCOVER_DESCRIPTION);
    expect(String(meta.description)).not.toMatch(/Automated/);
    expect(meta.openGraph).toEqual(expect.objectContaining({ title: DISCOVER_TITLE, description: DISCOVER_DESCRIPTION, type: 'website', url: '/discover-templates' }));
    expect(meta.twitter).toEqual(expect.objectContaining({ card: 'summary_large_image', title: DISCOVER_TITLE, description: DISCOVER_DESCRIPTION }));
    expect(meta.alternates).toEqual({ canonical: '/discover-templates' });
    // relative addresses (and the generated share picture) resolve against the site
    expect(String(meta.metadataBase)).toBe('https://www.beginso.com/');
  });
});

describe('the gallery page: body', () => {
  it('puts the cards in the server-rendered HTML', async () => {
    fetchGallery.mockResolvedValue(DATA);
    const page = await DiscoverTemplatesPage({ searchParams: Promise.resolve({}) });
    const html = renderToString(page);
    expect(html).toContain('Start from a template');
    expect(html).toContain('Job Application');
    expect(html).toContain('Wedding RSVP');
    expect(html).toContain('about 3 minutes');
  });

  it('opens already filtered when the address has ?category= and ?q= (a shared link)', async () => {
    fetchGallery.mockResolvedValue(DATA);
    const page = await DiscoverTemplatesPage({ searchParams: Promise.resolve({ category: 'Events & RSVPs', q: 'wedding' }) });
    render(page);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Wedding RSVP']);
    expect(screen.getByRole('searchbox', { name: 'Search templates' })).toHaveValue('wedding');
  });

  it('reads the first value when a parameter is repeated, and ignores a search that is far too long', async () => {
    fetchGallery.mockResolvedValue(DATA);
    const page = await DiscoverTemplatesPage({ searchParams: Promise.resolve({ category: ['HR & Hiring', 'Events & RSVPs'], q: 'x'.repeat(500) }) });
    render(page);
    expect((screen.getByRole('searchbox', { name: 'Search templates' }) as HTMLInputElement).value).toHaveLength(80);
  });

  it('still renders when the server could not get the cards (the browser loads them instead)', async () => {
    fetchGallery.mockResolvedValue(null);
    const page = await DiscoverTemplatesPage({ searchParams: Promise.resolve({}) });
    render(page);
    expect(screen.getByRole('heading', { level: 1, name: 'Start from a template' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No templates available yet');
  });
});
