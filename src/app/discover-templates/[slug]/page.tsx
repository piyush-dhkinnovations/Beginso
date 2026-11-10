'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { findTemplateBySlugOrId } from '@/lib/templateSlug';
import { useAuth } from '@/hooks/useAuth';
import { DeviceToggle, type PreviewDevice } from '@/components/preview/DeviceToggle';
import { TemplatePreviewFrame } from '@/components/templates/TemplatePreviewFrame';
import { templateHref } from '@/lib/templateSlug';
import { IconArt } from '@/components/forms/FormIcon';
import { suggestFormIcon } from '@/lib/formIcons';

// Split, not stacked: the details (what it's for, "Use this template") on the left, a real
// device-switchable preview on the right — both on screen together. The old layout put everything in
// one column above the live form, so roughly a third of the screen was text a visitor had to scroll
// past before seeing the form at all. The preview itself is a same-origin <iframe> of the template's
// own bare preview route (components/templates/TemplatePreviewFrame), not a width-constrained div —
// a real @media breakpoint only responds to the chosen device width if the iframe IS its own viewport.
export default function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: templates, isLoading } = usePublicTemplates();
  const template = findTemplateBySlugOrId(templates, slug);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // src/proxy.ts redirects an unauthenticated visit to a protected route to a bare `/login` with
  // no `?next=` preserved (unlike the invite-link flow, which isn't proxy-protected and decides
  // its own redirect client-side) — so linking straight to /templates/apply/{id} and trusting
  // proxy.ts to send an anonymous visitor onward with the template intent intact does not work.
  // Checking auth here and choosing the link explicitly is the fix.
  const { isAuthenticated } = useAuth();
  const useTemplateHref = isAuthenticated
    ? `/templates/apply/${template?._id}`
    : `/signup?next=${encodeURIComponent(`/templates/apply/${template?._id}`)}`;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-(--bg-page)">
        <Navbar />
        <div className="pt-28 pb-24 text-center max-w-xl mx-auto px-4">
          <p className="bg-body text-(--text-muted)">Loading template…</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!template) {
    return (
      <main className="min-h-screen bg-(--bg-page)">
        <Navbar />
        <div className="pt-28 pb-24 text-center max-w-xl mx-auto px-4">
          <h1 className="bg-h2 text-(--text-primary) mb-4">Template not found</h1>
          <Link href="/discover-templates" className="text-(--primary-600) font-medium hover:underline">
            Back to templates
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const liveFieldCount = template.fields.filter((f) => !f.deleted).length;
  const related = (templates ?? []).filter((t) => t.category === template.category && t._id !== template._id).slice(0, 4);

  return (
    <main className="min-h-screen bg-(--bg-page)">
      <Navbar />

      <article className="pt-28 pb-16 md:pt-32">
        {/* Wider than the old max-w-4xl: a two-column split needs the room a single text column didn't. */}
        <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 bg-caption text-(--text-muted) mb-6">
            <Link href="/discover-templates" className="hover:text-(--text-primary)">Templates</Link>
            <ChevronRight size={12} />
            <span className="text-(--text-secondary) truncate">{template.name}</span>
          </nav>

          {/* Not `sticky` — after three attempts at making a sticky element behave (the sidebar's click
              jumping to the page bottom, this column just scrolling past regardless of grid stretch),
              the simpler and more reliable fix is to not need it at all: the whole row is bounded to
              roughly one viewport's height, and each column scrolls WITHIN itself if its own content is
              taller than that — so both are always on screen together without anything needing to track
              where the other one is. */}
          <div className="flex flex-col gap-8 md:h-[calc(100vh_-_8rem)] md:flex-row md:gap-10">
            <div className="md:h-full md:w-2/5 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div>
                <Badge variant="primary" pill className="mb-3 capitalize">{template.category}</Badge>
                <h1 className="text-[28px] md:text-[36px] font-extrabold text-(--text-primary) leading-[1.15] mb-4">
                  {template.name}
                </h1>
                <p className="bg-body-lg text-(--text-secondary) mb-6 max-w-[48ch]">
                  {template.description || 'A ready-made starting point you can customize after signing up.'}
                </p>
                <p className="bg-body-sm text-(--text-muted) mb-6">
                  {liveFieldCount} {liveFieldCount === 1 ? 'question' : 'questions'}
                </p>
                <Link href={useTemplateHref}>
                  <Button variant="primary" size="default">Use this template</Button>
                </Link>

                {/* Fills what would otherwise be dead space below a short description — and gives someone
                    who decides this particular template isn't quite right a reason to stay in the same
                    category instead of leaving. */}
                {related.length > 0 && (
                  <div className="mt-12">
                    <p className="bg-overline text-(--text-muted) mb-3">More in {template.category}</p>
                    <ul className="flex flex-col gap-2.5">
                      {related.map((t) => {
                        const icon = suggestFormIcon(t.name);
                        const count = t.fields.filter((f) => !f.deleted).length;
                        return (
                          <li key={t._id}>
                            <Link
                              href={templateHref(t)}
                              className="lift flex items-center gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-3 transition-colors hover:bg-(--surface-hover)"
                            >
                              {icon && (
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-(--border-default) bg-(--surface-art) shadow-(--shadow-sm)">
                                  <IconArt icon={icon} size={22} />
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate bg-body-sm font-semibold text-(--text-primary)">{t.name}</span>
                                <span className="block bg-caption text-(--text-muted)">{count} {count === 1 ? 'field' : 'fields'}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* The real preview, switchable between what a phone, a tablet and a desktop visitor actually see.
                The box stays the same size whichever device is picked — only the form inside it scales. */}
            <div className="flex min-w-0 flex-1 flex-col md:h-full md:w-3/5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <p className="bg-overline text-(--text-muted)">Preview — try it out, nothing is submitted</p>
                <DeviceToggle device={device} onChange={setDevice} />
              </div>
              <div className="h-125 min-h-0 flex-1 overflow-auto rounded-xl bg-(--bg-subtle) p-2 md:p-4">
                <TemplatePreviewFrame slug={slug} device={device} title={`${template.name} preview`} />
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
