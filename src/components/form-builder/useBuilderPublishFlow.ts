import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import { expectPreview, IncompleteChoiceError, reloadBuilder, saveBuilderNow, syncBuilderVersion } from './useBuilderAutosave';
import { readAutoSave } from '@/lib/builderPrefs';
import { flushPendingEdits, hasPendingEdits } from '@/lib/pendingEdits';
import { formsService } from '@/services/forms';
import { isAxiosError } from 'axios';
import type { BuilderTarget } from './BuilderTabs';
import type { Form, FormStatus } from '@/types/form';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useBuilderPublishFlow({
  id,
  setActiveTab,
  setSaveState,
}: {
  id: string;
  setActiveTab: (tab: BuilderTarget) => void;
  setSaveState: (s: SaveState) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPublishModal, setShowPublishModal] = useState(false);

  const formId = useBuilderStore((state) => state.formId);
  const setActiveFieldId = useBuilderStore((state) => state.setActiveFieldId);
  const setActivePageId = useBuilderStore((state) => state.setActivePageId);
  const setStatus = useBuilderStore((state) => state.setStatus);

  /** Saves anything unsaved before an action that needs the server to have it. False (and a message) when it could not. */
  const saveFirst = useCallback(
    async (failure: string): Promise<boolean> => {
      if (!useBuilderStore.getState().dirty && !hasPendingEdits()) return true;
      try {
        setSaveState('saving');
        await saveBuilderNow();
        setSaveState('saved');
        return true;
      } catch (err) {
        setSaveState('error');
        toast(err instanceof IncompleteChoiceError ? `${err.message}, then try again.` : failure, 'error');
        return false;
      }
    },
    [setSaveState, toast]
  );

  // The publish pre-flight / live state own their mutations (PublishModal.tsx). The page only keeps the
  // builder store and the ['form', id] cache in step with every status or link change they report — publish,
  // unpublish, undo and "Generate new link" all land here.
  const handleStatusChange = useCallback(
    (nextStatus: FormStatus, nextSlug?: string) => {
      setStatus(nextStatus, nextSlug);
      queryClient.setQueryData<Form>(['form', formId], (oldData) =>
        oldData ? { ...oldData, status: nextStatus, ...(nextSlug ? { slug: nextSlug } : {}) } : oldData
      );
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      // Publishing/unpublishing moved the form's version on the server; adopt it so the next autosave is not refused.
      if (formId) void syncBuilderVersion(formId);
    },
    [setStatus, queryClient, formId]
  );

  // Opens the publish dialog. Readiness is the SERVER's, so the only work here is saving first: what gets published must be
  // what is on the screen.
  const handlePublishClick = useCallback(async () => {
    if (!formId || formId === 'undefined') return setShowPublishModal(true);
    if (await saveFirst('Could not save before publishing. Please try again.')) setShowPublishModal(true);
  }, [formId, saveFirst]);

  // The orange "Publish changes" button: saves first, then copies the staged draft onto the live, public form.
  const handlePublishChanges = useCallback(async () => {
    if (!formId || formId === 'undefined') return;
    if (!(await saveFirst('Could not save your changes, so they were not published. Please try again.'))) return;
    try {
      const updated = await formsService.publishDraftChanges(formId);
      const store = useBuilderStore.getState();
      store.setHasUnpublishedChanges(false);
      store.setDraftSavedAt(null);
      if (typeof updated.contentVersion === 'number') store.setContentVersion(updated.contentVersion);
      queryClient.setQueryData<Form>(['form', formId], (old) => (old ? { ...old, ...updated } : old));
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast('Your changes are now live.', 'success');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast('This form changed elsewhere since your last edit. Reload before publishing changes.', 'error');
      } else {
        toast('Could not publish your changes. Please try again.', 'error');
      }
    }
  }, [formId, saveFirst, toast, queryClient]);

  // Throws the staged draft away; the live form is untouched. A full reload is the simplest way to put the
  // editor back on the live content (same pattern the stale-save conflict's own "Reload" already uses).
  const handleDiscardDraft = useCallback(async () => {
    if (!formId || formId === 'undefined') return;
    try {
      await formsService.discardDraftChanges(formId);
      reloadBuilder();
    } catch {
      toast('Could not discard your changes. Please try again.', 'error');
    }
  }, [formId, toast]);

  // "Change" on a pre-flight row → the Settings section of Share & Settings; "Fix in editor" → the offending field on the Build tab.
  const handleChangeSetting = useCallback(() => {
    setShowPublishModal(false);
    setActiveTab('settings');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setActiveTab is a plain closure over router/id
  }, []);
  const handleFixField = useCallback(
    (fieldId?: string) => {
      setShowPublishModal(false);
      setActiveTab('build');
      if (!fieldId) return;
      const target = useBuilderStore.getState().fields.find((f) => f.fieldId === fieldId);
      if (target) setActivePageId(target.pageId);
      setActiveFieldId(fieldId);
      requestAnimationFrame(() =>
        document.querySelector(`[data-field-id="${fieldId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setActiveTab is a plain closure over router/id
    [setActivePageId, setActiveFieldId]
  );

  // The preview draws unsaved changes straight from this browser (lib/builderBackup.ts), so opening it does not save.
  // With Auto save on it saves first, as the rest of the builder does. The cached ['form', id] is dropped so the preview
  // and the returning editor fetch the saved copy.
  const handlePreview = useCallback(async () => {
    if (readAutoSave() && !(await saveFirst('Could not save your changes, so Preview was not opened. Please try again.'))) return;
    flushPendingEdits();
    expectPreview();
    queryClient.removeQueries({ queryKey: ['form', id] });
    router.push(`/forms/${id}/preview`);
  }, [saveFirst, id, queryClient, router]);

  // The same, in a NEW tab, for "Full screen" in the Branding studio: the editor stays where it is. The tab is opened at once, while the click
  // still counts (a browser blocks one opened after a wait). With Auto save on it is sent to the preview when the save is done.
  const handlePreviewInNewTab = useCallback(async () => {
    // ?bare=1: the form alone, filling the tab (the preview bar is for the editor's own Preview)
    const url = `/forms/${id}/preview?bare=1`;
    flushPendingEdits();
    const tab = window.open('about:blank', '_blank');
    if (readAutoSave() && !(await saveFirst('Could not save your changes, so the preview was not opened. Please try again.'))) {
      tab?.close();
      return;
    }
    queryClient.removeQueries({ queryKey: ['form', id] });
    if (tab) tab.location.href = url;
    else toast('Your browser blocked the new tab. Allow pop-ups for this site, or use Preview.', 'error');
  }, [saveFirst, id, queryClient, toast]);

  return { showPublishModal, setShowPublishModal, handleStatusChange, handlePublishClick, handlePublishChanges, handleDiscardDraft, handleChangeSetting, handleFixField, handlePreview, handlePreviewInNewTab };
}
