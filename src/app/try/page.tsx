'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Wordmark } from '@/components/landing/Wordmark';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { useAuth } from '@/hooks/useAuth';
import { instantiateTemplate, type TemplateInput } from '@/lib/guest/instantiateTemplate';
import { clearDraft, loadDraft, saveDraft, type GuestDraft } from '@/lib/guest/guestDraft';
import { isGalleryTemplate } from '@/lib/guest/galleryFilter';
import { LayoutThumb } from '@/components/guest/LayoutThumb';
import { LAYOUT_PRESETS } from '@/lib/layoutPresets';
import { trackFunnel } from '@/lib/guest/funnel';
import { cn } from '@/lib/utils';
import type { Template } from '@/types/form';

const FILTER_FROM = 12; // chips only appear when the gallery is big enough to need them

// Screen 1 of the logged-out builder: one click on a card opens the editor. No account, no server write; the only
// request is the public template read.
export default function TryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: templates, isLoading, error } = usePublicTemplates();
  const [category, setCategory] = useState('all');
  const [existing, setExisting] = useState<GuestDraft | null>(null);
  // Waiting on the "Start over" confirmation: either swap in a new template, or just discard the draft.
  const [pending, setPending] = useState<{ template: Template | null; discardOnly?: boolean } | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/templates'); // signed in: the normal create-form flow
  }, [authLoading, isAuthenticated, router]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only storage after mount (SSR has none)
    setExisting(loadDraft());
    trackFunnel('guest_start');
  }, []);

  // Internal/demo templates (showInGallery === false) are never offered to a guest.
  const gallery = useMemo(() => (templates ?? []).filter((t) => isGalleryTemplate(t)), [templates]);
  const categories = useMemo(() => [...new Set(gallery.map((t) => t.category))], [gallery]);
  const showChips = gallery.length > FILTER_FROM && categories.length > 1;
  const visible = gallery.filter((t) => category === 'all' || t.category === category);

  const start = async (template: Template | null) => {
    const fresh = template
      ? instantiateTemplate(template as unknown as TemplateInput)
      : { title: 'Untitled form', fields: [], pages: [{ id: crypto.randomUUID(), order: 0 }], settings: { honeypotEnabled: true } };
    await clearDraft();
    await saveDraft({ ...fresh, branding: {}, designed: true });
    trackFunnel('guest_template_chosen', { template: template?.name ?? 'blank' });
    router.push('/try/build');
  };
  // Landing-page template cards link here with ?template=<id>: open the editor with that template once the list is in.
  const wanted = useRef<string | null>(null);
  useEffect(() => {
    wanted.current = new URLSearchParams(window.location.search).get('template');
  }, []);
  useEffect(() => {
    const t = wanted.current ? gallery.find((x) => x._id === wanted.current) : undefined;
    if (t && !authLoading && !loadDraft()) {
      wanted.current = null;
      void start(t);
    }
  });
  const choose = (template: Template | null) => (existing ? setPending({ template }) : void start(template));

  const cards: { id: string; name: string; description: string; template: Template | null; labels: string[] }[] = [
    { id: 'blank', name: 'Blank form', description: 'Start empty and add your own questions.', template: null, labels: [] },
    ...visible.map((t) => ({ id: t._id, name: t.name, description: t.description, template: t, labels: t.fields.filter((f) => !f.deleted).map((f) => f.label) })),
  ];

  return (
    <main className="flex min-h-screen flex-col bg-(--bg-page) lg:h-dvh lg:overflow-hidden">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Beginso home"><Wordmark height={36} /></Link>
        <Link href="/login?next=/forms/claim" className="bg-body-sm font-medium text-(--text-secondary) hover:text-(--text-primary)">Log in</Link>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-6 sm:px-8">
        {existing && (
          <Alert variant="info" title="You have a form in progress">
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="small" onClick={() => router.push('/try/build')}>Continue</Button>
              <Button size="small" variant="secondary" onClick={() => setPending({ template: null, discardOnly: true })}>Start over</Button>
            </div>
          </Alert>
        )}

        <div>
          <h1 className="bg-h2 text-(--text-primary)">What do you want to collect?</h1>
          <p className="mt-1 bg-body-lg text-(--text-secondary)">Pick a starting point. You can change every question and the look in the editor. No account needed; you sign up when you save.</p>
        </div>

        {showChips && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
            {['all', ...categories].map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={cn('min-h-9 rounded-md border px-3 bg-body-sm font-medium capitalize', category === c ? 'border-(--border-focus) bg-(--accent-soft) text-(--accent-soft-text)' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)')}>
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="block" width="100%" height={180} />)}</div>
        ) : (
          <>
            {error && <p className="bg-body-sm text-(--text-muted)">Templates did not load. You can still start with a blank form.</p>}
            <ul className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3">
              {cards.map((c, idx) => (
                <li key={c.id} className="min-h-0">
                  <button type="button" disabled={authLoading} onClick={() => choose(c.template)} className="group grid h-full w-full grid-cols-[minmax(0,5fr)_minmax(0,4fr)] gap-4 rounded-xl border border-(--border-default) bg-(--surface-card) p-3 text-left transition-colors hover:border-(--border-focus) hover:bg-(--accent-soft) focus-visible:outline-2 focus-visible:outline-(--border-focus) max-sm:h-48">
                    <span className="min-h-0 py-0.5">
                      <LayoutThumb layout={LAYOUT_PRESETS[idx % LAYOUT_PRESETS.length].id} title={c.name} labels={c.labels} />
                    </span>
                    <span className="flex min-h-0 flex-col py-1">
                      <span className="bg-body font-semibold text-(--text-primary)">{c.name}</span>
                      <span className="mt-1 line-clamp-3 bg-body-sm text-(--text-secondary)">{c.description}</span>
                      <span className="mt-auto flex size-9 items-center justify-center self-end rounded-lg bg-(--bg-subtle) text-(--text-primary) transition-colors group-hover:bg-(--action-primary) group-hover:text-(--text-on-brand)">
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

      </div>

      <Modal isOpen={!!pending} onClose={() => setPending(null)} title="Start over?" description="Delete your draft on this device and start again?">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPending(null)}>Keep my draft</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const { template, discardOnly } = pending!;
              setPending(null);
              if (discardOnly) {
                await clearDraft();
                setExisting(null);
              } else {
                await start(template);
              }
            }}
          >
            Delete and start again
          </Button>
        </div>
      </Modal>
    </main>
  );
}
