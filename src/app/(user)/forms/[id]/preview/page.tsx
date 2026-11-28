'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { useAuth } from '@/hooks/useAuth';
import { useUnsavedPreview } from '@/lib/builderBackup';
import type { FormBranding } from '@/types/form';
import { lookBranding, normaliseLayout } from '@/lib/layoutPresets';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { Skeleton } from '@/components/ui/Skeleton';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';
import { SuccessScreen } from '@/components/public-form/SuccessScreen';
import { PreviewBar } from '@/components/preview/PreviewBar';
import { PreviewFrame } from '@/components/preview/PreviewFrame';
import { FormPageWash } from '@/components/preview/FormPageWash';
import type { PreviewDevice } from '@/components/preview/DeviceToggle';
import type { PublicFormSchema } from '@/types/publicForm';

// Modes of one route:
//  • default — the form's page over the whole screen, a same-origin iframe of this route (`?embed=1&bg=0`) as the form, and
//    the small floating PreviewBar. Choosing a device narrows only the iframe.
//  • `?bare=1` — the Branding studio's "Full screen": the form alone, filling the tab, with no bar and no frame around it, so it reads as the
//    published form does (it is still a preview: nothing is submitted for real).
//  • `?embed=1` — just the respondent view, in the form's own light theme (FormThemeScope). Also
//    used by the layout gallery, with `?layout=` to preview a preset before it is chosen.
// Preview mode is a property of THIS route, not persisted state, so leaving
// by any route clears it and /f/[slug] can never show the bar.
export default function FormPreviewPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const bare = searchParams.get('bare') === '1';
  const formOnly = embed || bare;
  // The default mode's frame: see-through, because the page around it draws the form's background.
  const seeThrough = embed && searchParams.get('bg') === '0';
  const layoutOverride = searchParams.get('layout') ?? undefined;
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // The Branding tab streams its unsaved branding + layout in over postMessage (same-origin only), so its preview is the
  // real form updating as you type, not a saved-copy that lags the autosave.
  const [live, setLive] = useState<{ branding: FormBranding; layout?: string; title?: string; screen?: 'form' | 'thanks' } | null>(null);
  useEffect(() => {
    if (!embed) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'beginso-live-branding') return;
      setLive({ branding: e.data.branding ?? {}, layout: e.data.layout, title: e.data.title, screen: e.data.screen === 'thanks' ? 'thanks' : 'form' });
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'beginso-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [embed]);

  // Inside a frame the form still scrolls, but without a scrollbar drawn over the preview; the full-screen preview keeps no
  // empty strip for one either.
  useEffect(() => {
    if (bare) return;
    const root = document.documentElement;
    root.style.scrollbarWidth = 'none';
    root.style.scrollbarGutter = 'auto';
    return () => {
      root.style.scrollbarWidth = '';
      root.style.scrollbarGutter = '';
    };
  }, [bare]);

  const { data: savedForm, isLoading: loadingForm, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
  });
  // Changes not saved yet are read from this browser and drawn over the saved form: the preview never saves anything.
  const { user, isLoading: loadingUser } = useAuth();
  const { form, unsaved } = useUnsavedPreview(id, user?.id, savedForm);
  const isLoading = loadingForm || loadingUser;

  // Tells the page holding this frame (the full-screen preview, the Branding studio) when there is something to see - the
  // form, or why it cannot be shown - so it can keep its own placeholder until then.
  const drawn = embed && !isLoading && (!!form || !!error);
  useEffect(() => {
    if (drawn) window.parent.postMessage({ type: 'beginso-preview-drawn' }, window.location.origin);
  }, [drawn]);

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

  if (!formOnly) {
    return (
      // Fixed over everything, so the screen never scrolls.
      <FormThemeScope>
        <FormPageWash branding={schema?.branding} layout={schema?.settings.layout} className="fixed inset-0 z-50">
          <PreviewFrame formId={id} device={device} title="Form preview" />
          <PreviewBar device={device} onDeviceChange={setDevice} backHref={`/forms/${id}/edit`} unsaved={unsaved} />
        </FormPageWash>
      </FormThemeScope>
    );
  }

  return (
    <FormThemeScope>
      <div
        className={
          seeThrough
            ? // The form's own background is switched off here: the page around this frame draws it.
              'fixed inset-0 z-50 overflow-y-auto bg-transparent scrollbar-none [&::-webkit-scrollbar]:hidden [&_.bg-form-type]:bg-transparent! [&_.bg-form-type]:bg-none! [&_.bg-form-type>div[aria-hidden]]:hidden'
            : 'fixed inset-0 z-50 overflow-y-auto bg-(--bg-subtle)'
        }
      >
        {isLoading && seeThrough ? null : isLoading ? ( // the page around the frame is already showing the placeholder
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
        ) : live?.screen === 'thanks' ? (
          // The studio's "Show it in the preview": the screen people see after sending, drawn with the unsaved branding. Nothing moves on from here.
          <SuccessScreen preview title={schema.title} message={schema.settings.successMessage || 'Your response has been submitted successfully.'} branding={schema.branding} again={null} />
        ) : (
          <PublicFormShell
            schema={schema}
            slug={form.slug ?? form._id}
            previewMode
            onTestSubmit={async (answers) => {
              // A test response is checked against the saved form, which does not have these changes yet.
              if (unsaved) throw new Error('Save your changes first, then send a test response.');
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
