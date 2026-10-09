'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { templatesService } from '@/services/templates';
import { Button } from '@/components/ui/Button';
import { TemplateDestinationPicker } from '@/components/templates/TemplateDestinationPicker';
import type { FormDestination } from '@/types/workspace';

interface PendingDestination {
  destination: FormDestination;
  workspaceSlug?: string;
}

// Universal landing target for "Use this template" from the public gallery
// (.kiro/specs/public-template-gallery/): a logged-out visitor arrives here via
// /signup?next=/templates/apply/[id] (or /login?next=...), an already-authenticated visitor
// arrives here directly.
//
// Requirement 7 / design.md "Half B": asks where the form should live (Personal vs Workspace)
// before creating it. `destinationWorkspaceId` on POST /api/templates/:id/use confirmed live and
// working 27 Sep 2026 (direct testing — see docs/backend-contract/api-reference.md): both `null`
// (personal) and a real workspace id land the created form's `workspaceId` exactly as requested.
// Replaces the earlier create-then-`formsService.moveForm()` workaround, no longer needed now
// that the backend accepts this directly in one call.
export default function ApplyTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pending, setPending] = useState<PendingDestination | null>(null);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({ destination }: PendingDestination) => {
      const destinationWorkspaceId = destination.type === 'workspace' ? destination.workspaceId : null;
      return templatesService.useTemplate(params.id, destinationWorkspaceId);
    },
    // '?ws=<slug>' matches CreateFormModal.tsx's / forms/page.tsx's own convention (lets
    // PersonalShell paint the right sidebar context immediately); '?tab=branding' matches
    // BuilderTabs' existing VALID_TABS/searchParams mechanism — opens straight on the Branding
    // tab so a template-started form gets customized before publishing.
    onSuccess: (form, { destination, workspaceSlug }) => {
      const wsParam = destination.type === 'workspace' && workspaceSlug ? `ws=${workspaceSlug}&` : '';
      router.replace(`/forms/${form._id}/edit?${wsParam}tab=branding`);
    },
  });

  const handleConfirm = (destination: FormDestination, workspaceSlug?: string) => {
    const next = { destination, workspaceSlug };
    setPending(next);
    mutate(next);
  };

  if (isError) {
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

  if (!pending) {
    return <TemplateDestinationPicker onConfirm={handleConfirm} isSubmitting={isPending} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-(--bg-page)" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--border-default) border-t-(--primary-500)" />
      <p className="bg-body-sm text-(--text-secondary)">{isPending ? 'Setting up your form…' : 'Almost done…'}</p>
    </div>
  );
}
