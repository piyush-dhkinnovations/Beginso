'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye } from 'lucide-react';
import { formsService } from '@/services/forms';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import type { PublicFormSchema } from '@/types/publicForm';

export default function FormPreviewPage() {
  const { id } = useParams() as { id: string };

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
  });

  const schema: PublicFormSchema | undefined = form && {
    title: form.title,
    pages: [...form.pages].sort((a, b) => a.order - b.order),
    fields: form.fields.filter((f) => !f.deleted).sort((a, b) => a.order - b.order),
    branding: form.branding,
    settings: {
      honeypotEnabled: form.settings.honeypotEnabled,
      successMessage: form.settings.successMessage,
      responseLimit: form.settings.responseLimit,
      closeDate: form.settings.closeDate,
      layout: form.settings.layout,
    },
  };

  return (
    // Fixed full-viewport overlay, independent of the user shell's <main> box model
    // (padding/min-height/overflow-y-auto) — avoids relying on negative-margin math to
    // exactly cancel it out, which is what produced the double-scrollbar bug.
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-neutral-50">
      <div className="flex items-center justify-between h-11 px-4 bg-neutral-900 text-white shrink-0">
        <span className="flex items-center gap-1.5 text-body-sm font-medium">
          <Eye size={14} />
          Preview — this is what respondents will see
        </span>
        <Link
          href={`/forms/${id}/edit`}
          className="flex items-center gap-1.5 text-body-sm font-medium text-neutral-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Close preview
        </Link>
      </div>

      {/* The only scrollable region — PublicFormShell's own min-h-screen is suppressed via
          previewMode so it doesn't force a second, independently-scrolling full-viewport box here. */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-body text-neutral-500">
            Loading preview…
          </div>
        ) : error || !form || !schema ? (
          <div className="flex items-center justify-center h-full text-body text-error">
            Could not load this form. Please go back and try again.
          </div>
        ) : (
          <PublicFormShell schema={schema} slug={form.slug ?? form._id} previewMode />
        )}
      </div>
    </div>
  );
}
