'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { findTemplateBySlugOrId } from '@/lib/templateSlug';
import { templateToPreviewSchema, templatePreviewSlug } from '@/lib/templatePreview';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';
import { Skeleton } from '@/components/ui/Skeleton';

// A bare, iframe-only route: the detail page's device preview (components/templates/TemplatePreviewFrame)
// loads this same-origin at a fixed device width, same reasoning /forms/[id]/preview?embed=1 already
// uses for the Branding studio's live preview — a real @media breakpoint only responds to an iframe's
// own width if the iframe IS its own viewport, which a width-constrained div can never be. Unlike that
// route, this one has no admin-chrome / `?bare=1` branch: the two-column detail page already owns the
// surrounding chrome, so this page is always just the form, nothing else.
export default function TemplatePreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: templates, isLoading } = usePublicTemplates();
  const template = findTemplateBySlugOrId(templates, slug);
  // The detail page's frame asks for a see-through document (?embed=1&bg=0): its own stage carries the form's page, so the form can sit on it at any device width.
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const seeThrough = searchParams.get('embed') === '1' && searchParams.get('bg') === '0';

  // No reserved scrollbar strip at the side of this document: it would show as an empty band next to the form's page.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.scrollbarGutter;
    root.style.scrollbarGutter = 'auto';
    return () => {
      root.style.scrollbarGutter = before;
    };
  }, []);

  if (isLoading || !template) {
    return (
      <div className="min-h-screen bg-(--bg-subtle) px-4 py-10" aria-busy={isLoading}>
        <div className="mx-auto flex max-w-160 flex-col gap-4">
          <Skeleton variant="title" width="60%" height={32} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="block" width="100%" height={56} />
          ))}
        </div>
      </div>
    );
  }

  // The whole document is the form, so it keeps the form's own light look whatever the visitor's theme (see FormThemeScope).
  // Inside a fixed, full-height box (as the Branding studio's preview is), so the shell's `min-h-full` has a height to fill and the form's own page
  // background covers the whole frame instead of stopping where the form ends.
  const shell = <PublicFormShell schema={templateToPreviewSchema(template)} slug={templatePreviewSlug(template._id)} previewMode search={search} />;

  return (
    <FormThemeScope>
      <div className={`fixed inset-0 z-50 overflow-y-auto ${seeThrough ? 'flex flex-col bg-transparent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'bg-(--bg-subtle)'}`}>
        {/* On its own (a new tab) the form fills the page. In the detail page's stage it sits in the middle of the page, not at the top; auto margins
            centre it, the padding keeps a tall form off the edges, and a form taller than the stage scrolls (without a scrollbar drawn over the page). */}
        {seeThrough ? <div className="my-auto w-full shrink-0 py-6 md:py-8">{shell}</div> : shell}
      </div>
    </FormThemeScope>
  );
}
