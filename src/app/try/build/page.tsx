'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderUndoShortcuts } from '@/components/form-builder/useBuilderUndoShortcuts';
import { SimpleCanvas } from '@/components/guest/SimpleCanvas';
import { DesignDrawer } from '@/components/guest/DesignDrawer';
import { GuestHeader, type SaveStatus } from '@/components/guest/GuestHeader';
import { GuestPreviewOverlay } from '@/components/guest/GuestPreviewOverlay';
import { CLAIM_PATH, GuestAccountModal } from '@/components/guest/GuestAccountModal';
import { useBuilderStore } from '@/store/builderStore';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth';
import { DRAFT_STORAGE_KEY, hydrateBranding, isDraftPersistent, loadDraft, saveDraft, versionOfRaw } from '@/lib/guest/guestDraft';
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
  // The draft version this tab is based on. Another tab saving first makes it stale: saving stops until a reload.
  const version = useRef(0);
  const stale = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

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
    version.current = draft.version ?? 0;
    void hydrateBranding(draft).then((hydrated) => {
      useBuilderStore.getState().initForm({
        _id: '', workspaceId: null, title: draft.title, status: 'draft', fields: draft.fields, pages: draft.pages,
        branding: hydrated, settings: draft.settings, schemaVersion: 1, responseCount: 0, createdAt: '', updatedAt: '',
      } as Form);
      setReady(true);
    });
  }, [router]);

  // Both use only refs (stable) and setSaved (stable setter) — useCallback([]) keeps them
  // stable so the autosave/flush effects can include them in deps without re-arming on every render.
  const markStale = useCallback(() => {
    stale.current = true;
    setSaved('stale');
  }, []);
  // One save at a time: a debounced save and a hidden-tab save must not race each other into a false conflict.
  const persist = useCallback(() => {
    const run = queue.current.then(async () => {
      if (stale.current) return;
      const s = useBuilderStore.getState();
      const r = await saveDraft({ title: s.formTitle, fields: s.fields, pages: s.pages, settings: s.settings, branding: s.branding, designed: true }, Date.now(), version.current);
      if (r.ok) version.current = r.version;
      if (!r.ok && r.reason === 'stale') return markStale();
      setSaved(!r.ok ? 'full' : r.persisted && isDraftPersistent() ? 'saved' : 'memory');
    });
    queue.current = run.catch(() => undefined);
    return run;
  }, [markStale]);
  // Another tab saved (or cleared) the draft: its `storage` event fires here, and this tab's copy is out of date.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DRAFT_STORAGE_KEY || (e.storageArea && e.storageArea !== localStorage)) return;
      const theirs = versionOfRaw(e.newValue);
      if (theirs === null || theirs !== version.current) markStale();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [markStale]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void persist(), 800);
    return () => clearTimeout(t);
  }, [ready, formTitle, fields, pages, branding, settings, persist]);
  useEffect(() => {
    const flush = () => document.visibilityState === 'hidden' && ready && void persist();
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [ready, persist]);

  const schema = useMemo(() => toPublicSchema({ title: formTitle, pages, fields, branding, settings }), [formTitle, pages, fields, branding, settings]);

  const save = async () => {
    void persist();
    if (isAuthenticated) return router.push(CLAIM_PATH); // already signed in: nothing to sign up for
    // This tab may have loaded before the person signed in somewhere else (another tab, the sign-in link in the gate): ask
    // the server before showing the sign-up gate again. A failed check just falls through to the gate.
    try {
      const session = await authService.probeSession();
      if (session?.user) return router.push(CLAIM_PATH);
    } catch {
      // not signed in, or the check failed: show the gate
    }
    trackFunnel('guest_gate_shown');
    setAccountOpen(true);
  };

  if (!ready) return <main className="min-h-screen bg-(--bg-page)" aria-busy="true" />;

  return (
    <main className="flex h-dvh flex-col bg-(--bg-subtle)">
      <GuestHeader title={formTitle} onTitle={setTitle} status={saved} onReload={() => window.location.reload()} onDesign={() => setDesignOpen(true)} onPreview={() => setPreviewing(true)} onSave={save} />

      {/* Simple mode: the form is the editor. One centred canvas and one scrollbar; no field palette, no pages column. Design
          opens as a drawer. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SimpleCanvas setTitle={setTitle} />
      </div>

      <DesignDrawer isOpen={designOpen} onClose={() => setDesignOpen(false)} />
      {previewing && <GuestPreviewOverlay schema={schema} onClose={() => setPreviewing(false)} />}
      <GuestAccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
    </main>
  );
}
