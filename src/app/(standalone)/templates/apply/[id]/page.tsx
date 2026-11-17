'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { templatesService } from '@/services/templates';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { findTemplateBySlugOrId } from '@/lib/templateSlug';
import { Button } from '@/components/ui/Button';

// Landing target for "Use this template" from the public gallery: a logged-out visitor arrives via
// /signup?next=/templates/apply/[id] (or /login?next=...), an already-authenticated visitor directly.
//
// The form is ALWAYS created in the person's personal account (destinationWorkspaceId: null): there is no
// "personal or workspace?" question. It is created as soon as the page opens, once, and the person lands in the
// builder on the Branding tab (`?tab=branding` is BuilderTabs' existing VALID_TABS mechanism), so a
// template-started form gets customised before publishing. They can move it to a workspace later from the Forms page.
//
// A brand-new account is first sent through /onboarding (authContext), which now returns here afterwards
// (?next=), so the template is applied instead of being dropped on the way to the dashboard.
//
// The address carries the template's SLUG (or, in an older link, its id). The id is looked up here, in the current list, because a template's id changes
// whenever the catalogue is loaded again from scratch, while its slug does not: a link or a sign-up in progress keeps working. A 24-character id that is
// not in the public list (a template that is not shown in the gallery) is tried as it is.
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export default function ApplyTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const started = useRef(false);
  const [notFound, setNotFound] = useState(false);
  const { data: templates, isLoading } = usePublicTemplates();

  const { mutate, isError } = useMutation({
    mutationFn: (templateId: string) => templatesService.useTemplate(templateId, null),
    onSuccess: (form) => router.replace(`/forms/${form._id}/edit?tab=branding`),
  });

  useEffect(() => {
    // Once only: a re-render or Strict Mode's second effect run must never create two forms.
    if (started.current || isLoading) return;
    const templateId = findTemplateBySlugOrId(templates, params.id)?._id ?? (OBJECT_ID.test(params.id) ? params.id : undefined);
    if (!templateId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- known only once the list has been answered
      setNotFound(true);
      return;
    }
    started.current = true;
    mutate(templateId);
  }, [isLoading, templates, params.id, mutate]);

  if (isError || notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--bg-page) px-4 text-center">
        <AlertCircle size={32} className="text-(--text-muted)" />
        <div>
          <h1 className="bg-h4 text-(--text-primary)">Couldn&apos;t create your form from this template</h1>
          <p className="mt-1 bg-body-sm text-(--text-secondary)">
            The template may no longer be available. You can try again from the templates gallery.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/discover-templates')}>
          Back to templates
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-(--bg-page)" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--border-default) border-t-(--primary-500)" />
      <p className="bg-body-sm text-(--text-secondary)">Setting up your form…</p>
    </div>
  );
}
