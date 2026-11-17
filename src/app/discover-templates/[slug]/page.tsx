'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, ExternalLink } from 'lucide-react';
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
import { LAYOUT_PRESETS, normaliseLayout } from '@/lib/layoutPresets';
import { templateToPreviewSchema } from '@/lib/templatePreview';
import { brandWashStyle } from '@/lib/formTheme';

// Split, not stacked: the details (what it's for, what is inside, "Use this template") on the left, a real
// device-switchable preview on the right, both on screen together. The preview is a same-origin <iframe> of the
// template's own bare preview route (components/templates/TemplatePreviewFrame), not a width-constrained div:
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

  const liveFields = template.fields.filter((f) => !f.deleted);
  const liveFieldCount = liveFields.length;
  const related = (templates ?? []).filter((t) => t.category === template.category && t._id !== template._id).slice(0, 4);
  const layoutName = LAYOUT_PRESETS.find((p) => p.id === normaliseLayout(template.settings?.layout))?.name;
  const pageCount = template.pages?.length ?? 1;
  const SHOWN = 8;
  const fullPreview = `/discover-templates/${slug}/preview`;
  // The form's own page (the colour, gradient or picture the template chose), drawn over the whole preview stage
  const pageStyle = brandWashStyle(templateToPreviewSchema(template).branding);

  return (
    <main className="min-h-screen bg-(--bg-page)">
      <Navbar />

      <article className="pt-28 pb-24 md:pt-32 md:pb-16">
        {/* Wider than the old max-w-4xl: a two-column split needs the room a single text column didn't. */}
        <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 bg-caption text-(--text-muted) mb-6">
            <Link href="/discover-templates" className="hover:text-(--text-primary)">Templates</Link>
            <ChevronRight size={12} />
            <span className="text-(--text-secondary) truncate">{template.name}</span>
          </nav>

          {/* Not `sticky`: the whole row is bounded to roughly one viewport's height, and the details column scrolls WITHIN itself
              if it is taller than that, so the form is always on screen next to them without anything tracking the other. */}
          <div className="flex flex-col gap-8 md:h-[calc(100vh_-_11rem)] md:flex-row md:gap-10">
            <div className="md:h-full md:w-2/5 md:overflow-y-auto md:pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Badge variant="primary" pill className="mb-3 capitalize">{template.category}</Badge>
              <h1 className="text-[28px] md:text-[36px] font-extrabold text-(--text-primary) leading-[1.15] mb-3">
                {template.name}
              </h1>
              <p className="bg-body-lg text-(--text-secondary) mb-5 max-w-[48ch]">
                {template.description || 'A ready-made starting point you can customize after signing up.'}
              </p>

              {/* What kind of form this is, at a glance */}
              <ul className="mb-6 flex flex-wrap gap-2 bg-body-sm text-(--text-secondary)">
                <li className="rounded-full border border-(--border-default) bg-(--surface-card) px-3 py-1">
                  {liveFieldCount} {liveFieldCount === 1 ? 'question' : 'questions'}
                </li>
                {pageCount > 1 && <li className="rounded-full border border-(--border-default) bg-(--surface-card) px-3 py-1">{pageCount} steps</li>}
                {layoutName && <li className="rounded-full border border-(--border-default) bg-(--surface-card) px-3 py-1">{layoutName} layout</li>}
              </ul>

              {/* The action sits with the title, not under the list, and says what happens next */}
              <div className="hidden md:block">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={useTemplateHref}>
                    <Button variant="primary" size="default">Use this template</Button>
                  </Link>
                  <a
                    href={fullPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-body-sm font-semibold text-(--text-link) hover:underline focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                  >
                    Open full preview
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
                <p className="mt-3 bg-caption text-(--text-muted)">It is copied into your account as a draft. Every question, colour and word stays yours to change.</p>
              </div>

              {liveFields.length > 0 && (
                <section aria-labelledby="inside-heading" className="mt-10">
                  <h2 id="inside-heading" className="bg-h5 mb-3 text-(--text-primary)">What is inside</h2>
                  <ol className="flex flex-col divide-y divide-(--border-subtle) rounded-xl border border-(--border-default) bg-(--surface-card)">
                    {liveFields.slice(0, SHOWN).map((f, i) => (
                      <li key={i} className="flex items-baseline gap-3 px-4 py-2.5 bg-body-sm">
                        <span className="w-5 shrink-0 text-right text-(--text-muted) tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1 text-(--text-primary)">{f.label || 'Untitled question'}</span>
                        {f.required && <span className="shrink-0 bg-caption text-(--text-muted)">Required</span>}
                      </li>
                    ))}
                    {liveFields.length > SHOWN && (
                      <li className="px-4 py-2.5 bg-body-sm text-(--text-muted)">and {liveFields.length - SHOWN} more</li>
                    )}
                  </ol>
                </section>
              )}

              {related.length > 0 && (
                <section aria-labelledby="related-heading" className="mt-10">
                  <h2 id="related-heading" className="bg-h5 mb-3 text-(--text-primary)">More in {template.category}</h2>
                  <ul className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                    {related.map((t) => {
                      const icon = suggestFormIcon(t.name);
                      const count = t.fields.filter((f) => !f.deleted).length;
                      return (
                        <li key={t._id}>
                          <Link
                            href={templateHref(t)}
                            className="lift flex h-full items-center gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-3 transition-colors hover:bg-(--surface-hover)"
                          >
                            {icon && (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-(--border-default) bg-(--surface-art) shadow-(--shadow-sm)">
                                <IconArt icon={icon} size={22} />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate bg-body-sm font-semibold text-(--text-primary)">{t.name}</span>
                              <span className="block bg-caption text-(--text-muted)">{count} {count === 1 ? 'question' : 'questions'}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>

            {/* The real preview, switchable between what a phone, a tablet and a desktop visitor actually see. It fills the box, so the
                form's own page background covers all of it. */}
            <div className="flex min-w-0 flex-1 flex-col md:h-full md:w-3/5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <DeviceToggle device={device} onChange={setDevice} />
                <p className="bg-caption text-(--text-muted)">Try it: nothing you type is saved or sent.</p>
              </div>
              <div className="h-[28rem] min-h-0 flex-1 md:h-auto">
                <TemplatePreviewFrame slug={slug} device={device} title={`${template.name} preview`} pageStyle={pageStyle} />
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* On a phone the action stays in reach while the form is looked at */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-(--border-default) bg-(--surface-card) p-3 md:hidden">
        <Link href={useTemplateHref} className="block">
          <Button variant="primary" size="default" className="w-full">Use this template</Button>
        </Link>
      </div>

      <Footer />
    </main>
  );
}
