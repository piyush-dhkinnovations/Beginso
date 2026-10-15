'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Wordmark } from '@/components/landing/Wordmark';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formsService } from '@/services/forms';
import { uploadService } from '@/services/upload';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { runClaim, type ClaimDeps } from '@/lib/guest/claim';
import { getBlobStore } from '@/lib/guest/blobStore';
import { GuestPreviewFrame } from '@/components/guest/GuestPreviewFrame';
import { toPublicSchema } from '@/lib/guest/previewSchema';
import { clearDraft, hydrateBranding, loadDraft, saveClaim, type ClaimStep, type GuestDraft } from '@/lib/guest/guestDraft';
import { trackFunnel } from '@/lib/guest/funnel';
import { cn } from '@/lib/utils';

type Phase = 'checking' | 'confirm' | 'running' | 'partial' | 'error';

const SUCCESS = 'Your form is saved in your personal space.';
// How many of the four visible items are finished once a claim step is reached.
const DONE_COUNT: Record<ClaimStep, number> = { draft_ready: 0, form_created: 1, content_saved: 2, assets_uploaded: 3, branding_linked: 4, done: 4 };

const deps: ClaimDeps = {
  createForm: (payload) => formsService.createForm(payload),
  saveContent: (formId, c) => formsService.updateForm(formId, c),
  uploadImage: (blob) => uploadService.uploadFile(new File([blob], 'image', { type: blob.type })),
  updateBranding: (formId, branding) => formsService.updateForm(formId, { branding }),
  getBlob: async (key) => (await getBlobStore()).get(key),
  saveClaim: (claim) => saveClaim(claim),
  finish: clearDraft,
};

// Full-screen page with no app sidebar: the visitor is mid-signup and has no workspace shell yet.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-(--bg-page)">
      <header className="shrink-0 border-b border-(--border-default) bg-(--surface-card) px-4 py-2 sm:px-8">
        <Link href="/" aria-label="Beginso home" className="inline-block"><Wordmark height={36} /></Link>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">{children}</div>
    </div>
  );
}

// Step 3 of the guest flow: the visitor is signed in, so the device-only draft becomes a real draft form in their
// PERSONAL space. Progress is stored with the draft, so a refresh or failure resumes where it stopped.
export default function ClaimPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('checking');
  const [draft, setDraft] = useState<GuestDraft | null>(null);
  const [message, setMessage] = useState('');
  const [formId, setFormId] = useState<string | null>(null);
  const [failedAt, setFailedAt] = useState<ClaimStep>('draft_ready');
  const started = useRef(false);
  const [branding, setBranding] = useState<GuestDraft['branding']>({});

  const run = async (d: GuestDraft) => {
    setPhase('running');
    const current = { ...d, claim: loadDraft()?.claim ?? d.claim };
    setFailedAt(current.claim.step);
    try {
      const result = await runClaim(current, {
        ...deps,
        saveClaim: (claim) => {
          saveClaim(claim);
          setFailedAt(claim.step);
        },
      });
      setFormId(result.formId);
      if (result.status === 'partial') {
        setPhase('partial');
        trackFunnel('guest_claim_failed', { step: 'assets_uploaded', partial: true });
        return;
      }
      trackFunnel('guest_claim_done');
      toast(SUCCESS, 'success');
      router.replace(`/forms/${result.formId}/edit?claimed=1`);
    } catch (err) {
      setMessage(getFriendlyErrorMessage(err));
      setPhase('error');
      trackFunnel('guest_claim_failed', { step: loadDraft()?.claim.step ?? 'unknown' });
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const d = loadDraft();
    if (!d) {
      router.replace('/forms');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only storage after mount (SSR has none)
    setDraft(d);
    void hydrateBranding(d).then(setBranding);
    trackFunnel('guest_signed_up');
    // A claim already under way (refresh, retry) continues without asking again.
    if (d.claim.step !== 'draft_ready') void run(d);
    else setPhase('confirm');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasImages = (draft?.imageKeys.length ?? 0) > 0;
  const items = [
    'Creating your form',
    'Adding your questions',
    ...(hasImages ? [draft!.imageKeys.length === 1 && draft!.imageKeys[0] === 'logoUrl' ? 'Uploading your logo' : 'Uploading your images'] : []),
    'Applying your branding',
  ];
  // Items finished for each claim step (the list is one shorter when there are no images).
  const finished = (step: ClaimStep) => (step === 'assets_uploaded' ? items.length - 1 : step === 'branding_linked' || step === 'done' ? items.length : Math.min(DONE_COUNT[step], 2));

  if (phase === 'checking' || !draft) return <Frame><PageHeader title="Saving your form" /></Frame>;

  const live = draft.fields.filter((f) => !f.deleted);
  const schema = toPublicSchema({ title: draft.title, pages: draft.pages, fields: draft.fields, branding, settings: draft.settings });
  const confirming = phase === 'confirm';

  return (
    <Frame>
      <PageHeader
        title={confirming ? 'Add this form to your account?' : 'Saving your form'}
        description={confirming ? 'You built it in this browser. It will arrive in your personal space as a draft, and nothing is published.' : 'This takes a few seconds.'}
      />

      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto">
          <div>
            <p className="bg-h4 font-bold text-(--text-primary)">{draft.title || 'Untitled form'}</p>
            <p className="bg-body text-(--text-secondary)">{live.length} {live.length === 1 ? 'question' : 'questions'}{draft.pages.length > 1 ? `, ${draft.pages.length} sections` : ''}</p>
            <ul className="mt-3 flex flex-col divide-y divide-(--border-default) border-y border-(--border-default)">
              {live.slice(0, 5).map((f) => (
                <li key={f.fieldId} className="truncate py-2 bg-body-sm text-(--text-secondary)">{f.label}</li>
              ))}
              {live.length > 5 && <li className="py-2 bg-body-sm text-(--text-muted)">and {live.length - 5} more</li>}
            </ul>
          </div>

          {confirming ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void run(draft)}>Add to my account</Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  await clearDraft();
                  router.replace('/forms');
                }}
              >
                Discard it
              </Button>
            </div>
          ) : (
            <ol className="flex flex-col gap-3" aria-live="polite">
              {items.map((label, i) => {
                const done = finished(failedAt) > i;
                const active = !done && i === finished(failedAt) && phase === 'running';
                return (
                  <li key={label} className={cn('flex items-center gap-3 bg-body', done || active ? 'text-(--text-primary)' : 'text-(--text-muted)')}>
                    <span aria-hidden="true" className={cn('flex size-6 items-center justify-center rounded-full border', done ? 'border-transparent bg-(--success-text) text-white' : 'border-(--border-strong)')}>
                      {done ? <Check size={14} /> : active ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : null}
                    </span>
                    {label}
                    <span className="sr-only">{done ? ', done' : active ? ', in progress' : ''}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {phase === 'partial' && formId && (
            <Alert variant="warning" title="Your logo didn't upload. The rest of your form is saved. Try the logo again.">
              <div className="mt-2 flex gap-3">
                <Button size="small" onClick={() => void run(draft)}>Try again</Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={async () => {
                    await clearDraft();
                    router.replace(`/forms/${formId}/edit?claimed=1`);
                  }}
                >
                  Open my form without it
                </Button>
              </div>
            </Alert>
          )}

          {phase === 'error' && (
            <Alert variant="error" title="Your form was not saved">
              <p>{message}</p>
              <p className="mt-1">Your draft is still on this device. If you are out of storage, empty some in <Link href="/trash" className="underline">Trash</Link>, then try again.</p>
              <div className="mt-2">
                <Button size="small" onClick={() => void run(draft)}>Try again</Button>
              </div>
            </Alert>
          )}
        </div>

        <div className="hidden min-h-0 min-w-0 lg:block">
          <GuestPreviewFrame schema={schema} fill title="Your form" />
        </div>
      </div>
    </Frame>
  );
}
