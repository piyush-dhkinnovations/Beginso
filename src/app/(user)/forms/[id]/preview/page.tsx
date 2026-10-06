'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { normaliseLayout } from '@/lib/layoutPresets';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { Skeleton } from '@/components/ui/Skeleton';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';
import { PreviewBar } from '@/components/preview/PreviewBar';
import { PreviewFrame } from '@/components/preview/PreviewFrame';
import type { PreviewDevice } from '@/components/preview/DeviceToggle';
import type { PublicFormSchema } from '@/types/publicForm';

// Two modes of one route (design.md §4):
//  • default — admin chrome: PreviewBar + a same-origin iframe of this route in `?embed=1` mode.
//  • `?embed=1` — just the respondent view, in the form's own light theme (FormThemeScope). Also
//    used by the layout gallery, with `?layout=` to preview a preset before it is chosen.
// Preview mode is a property of THIS route, not persisted state (requirements.md 3.2), so leaving
// by any route clears it and /f/[slug] can never show the bar.
export default function FormPreviewPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const layoutOverride = searchParams.get('layout') ?? undefined;
  const [device, setDevice] = useState<PreviewDevice>('desktop');

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
    enabled: embed,
  });

  if (!embed) {
    return (
      // Fixed full-viewport overlay, independent of the user shell's <main> box model.
      <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-(--bg-subtle)">
        <PreviewBar device={device} onDeviceChange={setDevice} backHref={`/forms/${id}/edit`} />
        <div className="flex-1 min-h-0 flex justify-center p-2 md:p-4">
          <PreviewFrame formId={id} device={device} title="Form preview" />
        </div>
      </div>
    );
  }

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
      layout: layoutOverride ? normaliseLayout(layoutOverride) : form.settings.layout,
      accessMode: form.settings.accessMode,
    },
  };

  return (
    <FormThemeScope>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-(--bg-subtle)">
        {isLoading ? (
          <div className="mx-auto flex max-w-160 flex-col gap-4 px-4 py-12" aria-busy="true">
            <Skeleton variant="title" width="60%" height={32} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="block" width="100%" height={56} />
            ))}
          </div>
        ) : error || !form || !schema ? (
          <div className="flex items-center justify-center h-full text-(--error-text)">
            Could not load this form. Please go back and try again.
          </div>
        ) : (
          <PublicFormShell
            schema={schema}
            slug={form.slug ?? form._id}
            previewMode
            onTestSubmit={async (answers) => {
              try {
                await formsService.sendTestSubmission(id, answers);
              } catch (err) {
                throw new Error(getFriendlyErrorMessage(err));
              }
            }}
          />
        )}
      </div>
    </FormThemeScope>
  );
}
