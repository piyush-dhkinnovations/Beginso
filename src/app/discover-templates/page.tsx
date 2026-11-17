import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { DiscoverTemplates, GalleryIntro } from '@/components/templates/DiscoverTemplates';
import { DISCOVER_DESCRIPTION, DISCOVER_TITLE, cleanQuery } from '@/lib/templateGallery';
import { publicOrigin } from '@/lib/publicFormUrl';
import { fetchGallery } from '@/services/templateGalleryServer';

export function generateMetadata(): Metadata {
  const origin = publicOrigin();
  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title: DISCOVER_TITLE,
    description: DISCOVER_DESCRIPTION,
    alternates: { canonical: '/discover-templates' },
    openGraph: { type: 'website', siteName: 'Beginso', url: '/discover-templates', title: DISCOVER_TITLE, description: DISCOVER_DESCRIPTION },
    twitter: { card: 'summary_large_image', title: DISCOVER_TITLE, description: DISCOVER_DESCRIPTION },
  };
}

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

// The cards are fetched here, on the server, so they are in the HTML a search engine or a slow connection receives. The chosen view (?category=, ?q=)
// is read here too, so a shared link opens already filtered. If the server cannot get the cards, the browser loads them instead (DiscoverTemplates).
export default async function DiscoverTemplatesPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const initial = await fetchGallery();

  return (
    <main className="min-h-screen bg-(--bg-page)">
      <Navbar />
      {/* Wider than blog/templates' own max-w-7xl: this page carries a sidebar beside a multi-column grid. */}
      <section className="mx-auto max-w-[96rem] px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="bg-h1 mb-3 text-(--text-primary)">Start from a template</h1>
          <GalleryIntro />
        </div>
        <DiscoverTemplates initial={initial} initialCategory={first(params.category)} initialQuery={cleanQuery(first(params.q))} />
      </section>
      <Footer />
    </main>
  );
}
