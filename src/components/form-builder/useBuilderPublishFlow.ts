import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import { saveFormSnapshot, syncBuilderVersion } from './useBuilderAutosave';
import type { BuilderTab } from './BuilderTabs';
import type { Form, FormStatus } from '@/types/form';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useBuilderPublishFlow({
  id,
  setActiveTab,
  setSaveState,
}: {
  id: string;
  setActiveTab: (tab: BuilderTab) => void;
  setSaveState: (s: SaveState) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPublishModal, setShowPublishModal] = useState(false);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const pages = useBuilderStore((state) => state.pages);
  const dirty = useBuilderStore((state) => state.dirty);
  const branding = useBuilderStore((state) => state.branding);
  const settings = useBuilderStore((state) => state.settings);
  const setActiveFieldId = useBuilderStore((state) => state.setActiveFieldId);
  const setActivePageId = useBuilderStore((state) => state.setActivePageId);
  const setStatus = useBuilderStore((state) => state.setStatus);
  const markSaved = useBuilderStore((state) => state.markSaved);

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

  // Opens the publish dialog. Readiness is the SERVER's (the old client-side duplicates are gone), so the only
  // work here is flushing a pending autosave first — the published snapshot must be current.
  const handlePublishClick = useCallback(async () => {
    if (dirty && formId && formId !== 'undefined') {
      try {
        setSaveState('saving');
        await saveFormSnapshot(formId, { fields, formTitle, pages, branding, settings });
        markSaved();
        setSaveState('saved');
      } catch {
        setSaveState('error');
        toast('Could not save before publishing. Please try again.', 'error');
        return;
      }
    }

    setShowPublishModal(true);
  }, [dirty, formId, fields, formTitle, pages, branding, settings, markSaved, toast, setSaveState]);

  // "Change" on a pre-flight row → Settings; "Fix in editor" → the offending field on the Build tab.
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

  // Preview opens in the SAME tab (requirements.md 3.1) so "Back to editor" has somewhere to return
  // to. The save is flushed first and a failed save blocks navigation — leaving would otherwise lose
  // the unsaved edits (the old new-tab version could shrug a failure off; this one cannot). The
  // cached ['form', id] is dropped so both Preview and the returning editor refetch the autosaved
  // copy instead of the stale GET the init effect warns about.
  const handlePreview = useCallback(async () => {
    if (dirty && formId && formId !== 'undefined') {
      try {
        setSaveState('saving');
        await saveFormSnapshot(formId, { fields, formTitle, pages, branding, settings });
        markSaved();
        setSaveState('saved');
      } catch {
        setSaveState('error');
        toast('Could not save your changes, so Preview was not opened. Please try again.', 'error');
        return;
      }
    }
    queryClient.removeQueries({ queryKey: ['form', id] });
    router.push(`/forms/${id}/preview`);
  }, [dirty, formId, fields, formTitle, pages, branding, settings, markSaved, id, queryClient, router, toast, setSaveState]);

  return { showPublishModal, setShowPublishModal, handleStatusChange, handlePublishClick, handleChangeSetting, handleFixField, handlePreview };
}
