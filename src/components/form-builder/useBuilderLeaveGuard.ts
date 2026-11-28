import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builderStore';
import { clearBackup } from '@/lib/builderBackup';
import { flushPendingEdits, hasPendingEdits } from '@/lib/pendingEdits';

const hasUnsaved = () => useBuilderStore.getState().dirty || hasPendingEdits();

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
 * Asks before leaving the builder with unsaved changes: the back arrow, and any link to another page of the app (sidebar,
 * top bar, menus). Closing or reloading the tab is the browser's own warning (useBuilderAutosave), and whatever slips past
 * both, such as the browser's Back button, is kept in this browser (useBuilderBackup).
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

  const ask = useCallback((url: string) => {
    setPendingNavUrl(url);
    setShowLeaveModal(true);
  }, []);

  // Links anywhere on the page. Captured before the link handles the click, so preventDefault stops the navigation.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const url = leavingTo(e, formId);
      if (!url || !hasUnsaved()) return;
      e.preventDefault();
      ask(url);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [formId, ask]);

  // The sidebar hands over the destination of a click it stopped.
  const pendingLeaveUrl = useBuilderStore((state) => state.pendingLeaveUrl);
  const setPendingLeaveUrlInStore = useBuilderStore((state) => state.setPendingLeaveUrl);
  useEffect(() => {
    if (pendingLeaveUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the modal from the store value that Sidebar sets
      ask(pendingLeaveUrl);
      setPendingLeaveUrlInStore(null);
    }
  }, [pendingLeaveUrl, setPendingLeaveUrlInStore, ask]);

  const handleBack = useCallback(() => {
    if (hasUnsaved()) ask(overviewHref);
    else router.push(overviewHref);
  }, [router, overviewHref, ask]);

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
    router.push(dest);
  }, [formId, pendingNavUrl, router, formsListHref, close]);

  const handleSaveAndLeave = useCallback(async () => {
    setSavingToLeave(true);
    const saved = await onSave();
    setSavingToLeave(false);
    const dest = pendingNavUrl ?? formsListHref;
    close(); // on failure the person stays, with the reason shown by the builder
    if (saved) router.push(dest);
  }, [onSave, pendingNavUrl, formsListHref, close, router]);

  return { showLeaveModal, savingToLeave, handleBack, handleLeaveWithoutSaving, handleSaveAndLeave, handleStay: close };
}
