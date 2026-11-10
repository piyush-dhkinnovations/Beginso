'use client';

import { useParams } from 'next/navigation';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { findTemplateBySlugOrId } from '@/lib/templateSlug';
import { templateToPreviewSchema, templatePreviewSlug } from '@/lib/templatePreview';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
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

  return <PublicFormShell schema={templateToPreviewSchema(template)} slug={templatePreviewSlug(template._id)} previewMode />;
}
