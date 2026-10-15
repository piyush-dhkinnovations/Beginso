'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderUndoShortcuts } from '@/components/form-builder/useBuilderUndoShortcuts';
import { SimpleCanvas, addQuestionToActive } from '@/components/guest/SimpleCanvas';
import { LeftPanel, RightPanel } from '@/components/guest/EditorPanels';
import { DesignDrawer } from '@/components/guest/DesignDrawer';
import { GuestHeader, type SaveStatus } from '@/components/guest/GuestHeader';
import { GuestPreviewOverlay } from '@/components/guest/GuestPreviewOverlay';
import { CLAIM_PATH, GuestAccountModal } from '@/components/guest/GuestAccountModal';
import { useBuilderStore } from '@/store/builderStore';
import { useAuth } from '@/hooks/useAuth';
import { hydrateBranding, isDraftPersistent, loadDraft, saveDraft } from '@/lib/guest/guestDraft';
import { toPublicSchema } from '@/lib/guest/previewSchema';
import { trackFunnel } from '@/lib/guest/funnel';
import type { Form } from '@/types/form';

// The logged-out editor: the same store and Build components as /forms/[id]/edit, saving to this browser
// (lib/guest/guestDraft) instead of PATCH /api/forms/:id. One header; Build | Design; Preview opens an overlay;
// Publish opens the one account modal.
export default function GuestBuilderPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  useBuilderUndoShortcuts();

  const [ready, setReady] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saved, setSaved] = useState<SaveStatus>('saved');

  const formTitle = useBuilderStore((s) => s.formTitle);
  const fields = useBuilderStore((s) => s.fields);
  const pages = useBuilderStore((s) => s.pages);
  const branding = useBuilderStore((s) => s.branding);
  const settings = useBuilderStore((s) => s.settings);
  // One title: the form's name and the heading respondents see are the same text.
  const setTitle = (t: string) => {
    const { setFormTitle, setPageTitle, pages: ps } = useBuilderStore.getState();
    setFormTitle(t);
    const first = [...ps].sort((a, b) => a.order - b.order)[0];
    if (first) setPageTitle(first.id, t);
  };

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) {
      router.replace('/try');
      return;
    }
    void hydrateBranding(draft).then((hydrated) => {
      useBuilderStore.getState().initForm({
        _id: '', workspaceId: null, title: draft.title, status: 'draft', fields: draft.fields, pages: draft.pages,
        branding: hydrated, settings: draft.settings, schemaVersion: 1, responseCount: 0, createdAt: '', updatedAt: '',
      } as Form);
      setReady(true);
    });
  }, [router]);

  const persist = async () => {
    const s = useBuilderStore.getState();
    const r = await saveDraft({ title: s.formTitle, fields: s.fields, pages: s.pages, settings: s.settings, branding: s.branding, designed: true });
    setSaved(!r.ok ? 'full' : r.persisted && isDraftPersistent() ? 'saved' : 'memory');
  };
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void persist(), 800);
    return () => clearTimeout(t);
  }, [ready, formTitle, fields, pages, branding, settings]);
  useEffect(() => {
    const flush = () => document.visibilityState === 'hidden' && ready && void persist();
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  });

  const schema = useMemo(() => toPublicSchema({ title: formTitle, pages, fields, branding, settings }), [formTitle, pages, fields, branding, settings]);

  const save = () => {
    void persist();
    if (isAuthenticated) return router.push(CLAIM_PATH); // already signed in: nothing to sign up for
    trackFunnel('guest_gate_shown');
    setAccountOpen(true);
  };

  if (!ready) return <main className="min-h-screen bg-(--bg-page)" aria-busy="true" />;

  return (
    <main className="flex h-dvh flex-col bg-(--bg-subtle)">
      <GuestHeader title={formTitle} onTitle={setTitle} status={saved} onDesign={() => setDesignOpen(true)} onPreview={() => setPreviewing(true)} onSave={save} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-(--border-default) bg-(--surface-card) p-4 lg:block">
          <LeftPanel onAdd={addQuestionToActive} />
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto">
          <SimpleCanvas setTitle={setTitle} />
        </div>
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-(--border-default) bg-(--surface-card) p-4 lg:block">
          <RightPanel onSave={save} />
        </aside>
      </div>

      <DesignDrawer isOpen={designOpen} onClose={() => setDesignOpen(false)} />
      {previewing && <GuestPreviewOverlay schema={schema} onClose={() => setPreviewing(false)} />}
      <GuestAccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
    </main>
  );
}
