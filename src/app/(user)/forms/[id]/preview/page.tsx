'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import type { FormBranding } from '@/types/form';
import { lookBranding, normaliseLayout } from '@/lib/layoutPresets';
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
//  • `?bare=1` — the Branding studio's "Full screen": the form alone, filling the tab, with no bar and no frame around it, so it reads as the
//    published form does (it is still a preview: nothing is submitted for real).
//  • `?embed=1` — just the respondent view, in the form's own light theme (FormThemeScope). Also
//    used by the layout gallery, with `?layout=` to preview a preset before it is chosen.
// Preview mode is a property of THIS route, not persisted state (requirements.md 3.2), so leaving
// by any route clears it and /f/[slug] can never show the bar.
export default function FormPreviewPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const bare = searchParams.get('bare') === '1';
  const formOnly = embed || bare;
  const layoutOverride = searchParams.get('layout') ?? undefined;
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // The Branding tab streams its unsaved branding + layout in over postMessage (same-origin only), so its preview is the
  // real form updating as you type, not a saved-copy that lags the autosave.
  const [live, setLive] = useState<{ branding: FormBranding; layout?: string; title?: string } | null>(null);
  useEffect(() => {
    if (!embed) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'beginso-live-branding') return;
      setLive({ branding: e.data.branding ?? {}, layout: e.data.layout, title: e.data.title });
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'beginso-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [embed]);

  // Inside the studio's frame the form still scrolls, but without a scrollbar drawn over the preview.
  useEffect(() => {
    if (!embed) return;
    const root = document.documentElement;
    root.style.scrollbarWidth = 'none';
    root.style.scrollbarGutter = 'auto';
    return () => {
      root.style.scrollbarWidth = '';
      root.style.scrollbarGutter = '';
    };
  }, [embed]);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
    enabled: formOnly,
  });

  // Tells the Branding studio when the form is on screen, so it can hold its own placeholder until then.
  const drawn = embed && !isLoading && !!form;
  useEffect(() => {
    if (drawn) window.parent.postMessage({ type: 'beginso-preview-drawn' }, window.location.origin);
  }, [drawn]);

  if (!formOnly) {
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
    title: live?.title ?? form.title,
    pages: [...form.pages].sort((a, b) => a.order - b.order),
    fields: form.fields.filter((f) => !f.deleted).sort((a, b) => a.order - b.order),
    // A gallery preview (?layout=) shows the preset's own look - colour, font, card and panel - exactly as "Use this layout" would apply it.
    branding: live ? live.branding : layoutOverride ? { ...form.branding, ...lookBranding(normaliseLayout(layoutOverride), form.branding, true) } : form.branding,
    settings: {
      honeypotEnabled: form.settings.honeypotEnabled,
      successMessage: form.settings.successMessage,
      responseLimit: form.settings.responseLimit,
      closeDate: form.settings.closeDate,
      layout: layoutOverride ? normaliseLayout(layoutOverride) : live?.layout ? normaliseLayout(live.layout) : form.settings.layout,
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
