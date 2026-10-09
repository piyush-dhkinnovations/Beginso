import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builderStore';

export function useBuilderLeaveGuard({ overviewHref, formsListHref }: { overviewHref: string; formsListHref: string }) {
  const router = useRouter();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const dirty = useBuilderStore((state) => state.dirty);

  // Intercept in-app navigation when dirty: capture the intended URL, show modal.
  // Sidebar link clicks are caught too — it reads `dirty` from builderStore directly
  // and, when on this route, redirects the click into `pendingLeaveUrl` instead of
  // navigating; the effect below picks that up and opens the same modal.
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const pendingLeaveUrl = useBuilderStore((state) => state.pendingLeaveUrl);
  const setPendingLeaveUrlInStore = useBuilderStore((state) => state.setPendingLeaveUrl);
  // Syncing local modal-visibility state from an external store value set by
  // Sidebar — same pattern already used in DeleteFormModal.tsx for the same
  // kind of sync.
  useEffect(() => {
    if (pendingLeaveUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingNavUrl(pendingLeaveUrl);
      setShowLeaveModal(true);
      setPendingLeaveUrlInStore(null);
    }
  }, [pendingLeaveUrl, setPendingLeaveUrlInStore]);

  const handleBack = useCallback(() => {
    if (dirtyRef.current) {
      setPendingNavUrl(overviewHref);
      setShowLeaveModal(true);
    } else {
      router.push(overviewHref);
    }
  }, [router, overviewHref]);

  const handleLeaveWithoutSaving = useCallback(() => {
    const dest = pendingNavUrl ?? formsListHref;
    setPendingNavUrl(null);
    setShowLeaveModal(false);
    router.push(dest);
  }, [pendingNavUrl, router, formsListHref]);

  const handleStay = useCallback(() => {
    setPendingNavUrl(null);
    setShowLeaveModal(false);
  }, []);

  return { showLeaveModal, handleBack, handleLeaveWithoutSaving, handleStay };
}
