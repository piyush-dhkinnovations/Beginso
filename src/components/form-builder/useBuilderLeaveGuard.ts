import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builderStore';
import { clearBackup } from '@/lib/builderBackup';
import { readAutoSave } from '@/lib/builderPrefs';
import { flushPendingEdits, hasPendingEdits, usePendingEdits } from '@/lib/pendingEdits';

const hasUnsaved = () => useBuilderStore.getState().dirty || hasPendingEdits();

/** "Where to" when the person pressed the browser's Back button. Not a real address. */
const BACK = '<back>';
/** How long going back may take before we accept that there is no earlier page (the builder was opened directly). */
export const BACK_FALLBACK_MS = 600;

/**
 * The browser gives a page no way to refuse its Back button. So while there are unsaved changes the builder's own history
 * entry is doubled: Back then only returns to the identical entry underneath, where we can step forward again and ask.
 * Leaving for real steps back until it is off the builder's address.
 */
function useBackButtonGuard({ unsaved, onBack, fallback }: { unsaved: boolean; onBack: () => void; fallback: () => void }) {
  const state = useRef({ armed: false, returning: false, leaving: false, path: '' });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ onBack, fallback });
  useEffect(() => {
    latest.current = { onBack, fallback };
  });

  const arm = useCallback(() => {
    const g = state.current;
    if (g.armed || g.leaving || !hasUnsaved()) return;
    // Chrome skips entries added before the person has touched the page (changes restored from this browser): wait.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    g.path = window.location.pathname;
    // The same state and address: Next.js sees its own entry and does nothing.
    window.history.pushState(window.history.state, '', window.location.href);
    g.armed = true;
  }, []);

  useEffect(() => {
    if (!unsaved) return;
    arm();
    window.addEventListener('pointerup', arm);
    window.addEventListener('keyup', arm);
    return () => {
      window.removeEventListener('pointerup', arm);
      window.removeEventListener('keyup', arm);
    };
  }, [unsaved, arm]);

  /** Leave the way Back would have: to whatever came before the builder, or to the fallback when nothing did. */
  const leave = useCallback(() => {
    const g = state.current;
    g.armed = false;
    g.leaving = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!g.leaving) return;
      g.leaving = false;
      latest.current.fallback();
    }, BACK_FALLBACK_MS);
    window.history.back();
  }, []);

  useEffect(() => {
    const g = state.current;
    const onPop = () => {
      const onBuilder = window.location.pathname === g.path;
      if (g.leaving) {
        if (onBuilder) window.history.back(); // another entry of the builder itself
        else {
          g.leaving = false;
          clearTimeout(timer.current);
        }
        return;
      }
      if (g.returning) {
        g.returning = false;
        return;
      }
      if (!g.armed || !onBuilder) return;
      if (hasUnsaved()) {
        g.returning = true;
        window.history.forward();
        latest.current.onBack();
      } else {
        leave(); // saved since: this one press of Back should leave
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      clearTimeout(timer.current);
    };
  }, [leave]);

  /** True when the doubled entry is on top: going somewhere else should then replace it, not stack on it. */
  const takeEntry = useCallback(() => {
    const was = state.current.armed;
    state.current.armed = false;
    return was;
  }, []);

  return { leave, takeEntry };
}

/** Where a plain click on this element would take the person, when that is another page of this app; otherwise null. */
function leavingTo(e: MouseEvent, formId: string): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return null;
  const url = new URL(link.href, window.location.href);
  // Another site: the browser's own leave warning covers it. The builder and its preview keep the changes.
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname || url.pathname === `/forms/${formId}/preview`) return null;
  return url.pathname + url.search + url.hash;
}

/**
 * Asks before leaving the builder with unsaved changes: the back arrow, the browser's Back button, and any link to another
 * page of the app (sidebar, top bar, menus). With Auto save on there is nothing to ask: leaving saves first, and the
 * question appears only if that save does not go through. Closing or reloading the tab is the browser's own warning
 * (useBuilderAutosave), and whatever slips past both is kept in this browser (useBuilderBackup).
 */
export function useBuilderLeaveGuard({
  formId,
  overviewHref,
  formsListHref,
  onSave,
}: {
  formId: string;
  overviewHref: string;
  formsListHref: string;
  /** Saves everything; resolves to whether that worked. */
  onSave: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [savingToLeave, setSavingToLeave] = useState(false);

  const showQuestion = useCallback((url: string) => {
    setPendingNavUrl(url);
    setShowLeaveModal(true);
  }, []);
  // Set below, once it can navigate; the history guard and the listeners only ever call it later.
  const askRef = useRef<(url: string) => void>(showQuestion);
  const ask = useCallback((url: string) => askRef.current(url), []);

  const storeDirty = useBuilderStore((state) => state.dirty);
  const pending = usePendingEdits();
  const { leave: leaveBack, takeEntry } = useBackButtonGuard({
    unsaved: storeDirty || pending,
    onBack: () => ask(BACK),
    fallback: () => router.replace(overviewHref),
  });

  /** Goes to an address of the app, dropping the doubled history entry when there is one. */
  const goTo = useCallback(
    (url: string) => {
      if (url === BACK) leaveBack();
      else if (takeEntry()) router.replace(url);
      else router.push(url);
    },
    [router, leaveBack, takeEntry]
  );

  const savingFirst = useRef(false);
  const latestSave = useRef(onSave);
  useEffect(() => {
    latestSave.current = onSave;
    askRef.current = (url: string) => {
      if (!readAutoSave()) return showQuestion(url);
      if (savingFirst.current) return; // a second click while the first is saving
      savingFirst.current = true;
      void latestSave.current().then((saved) => {
        savingFirst.current = false;
        if (saved && !hasUnsaved()) goTo(url);
        else showQuestion(url);
      });
    };
  }, [onSave, goTo, showQuestion]);

  // Links anywhere on the page. Captured before the link handles the click, so preventDefault stops the navigation.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const url = leavingTo(e, formId);
      if (!url) return;
      if (hasUnsaved()) {
        e.preventDefault();
        ask(url);
      } else if (takeEntry()) {
        e.preventDefault();
        router.replace(url);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [formId, ask, takeEntry, router]);

  // The sidebar hands over the destination of a click it stopped.
  const pendingLeaveUrl = useBuilderStore((state) => state.pendingLeaveUrl);
  const setPendingLeaveUrlInStore = useBuilderStore((state) => state.setPendingLeaveUrl);
  useEffect(() => {
    if (pendingLeaveUrl) {
      ask(pendingLeaveUrl);
      setPendingLeaveUrlInStore(null);
    }
  }, [pendingLeaveUrl, setPendingLeaveUrlInStore, ask]);

  const handleBack = useCallback(() => {
    if (hasUnsaved()) ask(overviewHref);
    else goTo(overviewHref);
  }, [goTo, overviewHref, ask]);

  const close = useCallback(() => {
    setPendingNavUrl(null);
    setShowLeaveModal(false);
  }, []);

  const handleLeaveWithoutSaving = useCallback(() => {
    // Typed text is taken in first, so that it is given up too and cannot come back as unsaved.
    flushPendingEdits();
    useBuilderStore.getState().discardUnsaved();
    clearBackup(formId);
    const dest = pendingNavUrl ?? formsListHref;
    close();
    goTo(dest);
  }, [formId, pendingNavUrl, goTo, formsListHref, close]);

  const handleSaveAndLeave = useCallback(async () => {
    setSavingToLeave(true);
    const saved = await onSave();
    setSavingToLeave(false);
    const dest = pendingNavUrl ?? formsListHref;
    close(); // on failure the person stays, with the reason shown by the builder
    if (saved) goTo(dest);
  }, [onSave, pendingNavUrl, formsListHref, close, goTo]);

  return { showLeaveModal, savingToLeave, handleBack, handleLeaveWithoutSaving, handleSaveAndLeave, handleStay: close };
}
