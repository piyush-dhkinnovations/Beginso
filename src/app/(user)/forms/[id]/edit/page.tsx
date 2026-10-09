'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Active,
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  Over,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { useBuilderStore } from '@/store/builderStore';
import { FormSubNav } from '@/components/forms/FormSubNav';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { BuilderTabs, BuilderTab } from '@/components/form-builder/BuilderTabs';
import { useToast } from '@/components/ui/Toast';
import { Canvas, CANVAS_ID } from '@/components/form-builder/Canvas';
import { PagesPanel, PageSwitcher } from '@/components/form-builder/PagesPanel';
import { Toolbox, FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import { SettingsPanel } from '@/components/form-builder/SettingsPanel';
import { AddFieldSheet } from '@/components/form-builder/AddFieldSheet';
import { BrandingTabContent } from '@/components/form-builder/BrandingTabContent';
import { MobileBuildBar } from '@/components/form-builder/MobileBuildBar';
import { ShareView } from '@/components/form-builder/ShareView';
import { PublishModal } from '@/components/form-builder/PublishModal';
import { CloseFormModal } from '@/components/form-builder/CloseFormModal';
import { LeaveBuilderModal } from '@/components/form-builder/LeaveBuilderModal';
import { trashService } from '@/services/trash';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { canSeeShare, canPublishForm, canDeleteForm, hasCapability } from '@/lib/roles';
import type { FieldType, Form, FormBranding, FormField, FormPage, FormSettings, FormStatus } from '@/types/form';

// Shared by handleDragOver (visual indicator) and handleDragEnd (actual insert)
// so the two never disagree about which side of the hovered card the drag is on.
function isDroppingBelow(active: Active, over: Over | null): boolean {
  return Boolean(
    active.rect.current.translated &&
    over?.rect &&
    active.rect.current.translated.top > over.rect.top + over.rect.height / 2
  );
}

// pointerWithin needs pointer coordinates, which a keyboard drag does not have: without this fallback
// a keyboard reorder never finds a drop target and silently does nothing.
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

const VALID_TABS: BuilderTab[] = ['build', 'branding', 'settings', 'share'];

// Single source of truth for the PATCH payload shape — the debounced autosave, the
// unmount flush, the publish-click flush, and the leave-guard flush all call this
// instead of each hand-rolling the same field-name mapping.
function saveFormSnapshot(
  formId: string,
  snap: { fields: FormField[]; formTitle: string; pages: FormPage[]; branding: FormBranding; settings: FormSettings }
) {
  return formsService.updateForm(formId, {
    fields: snap.fields,
    title: snap.formTitle,
    pages: snap.pages,
    branding: snap.branding,
    settings: snap.settings,
  });
}

export default function BuilderPageShell() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // The URL is the single source of truth for the active tab (?tab=settings), so the form sidebar's
  // Settings link, deep links, reload and the tab bar all agree. State copied from the URL once at mount
  // ignored in-page navigation (the sidebar link changed the URL but not the tab).
  const tabFromUrl = searchParams.get('tab') as BuilderTab | null;
  const activeTab: BuilderTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'build';
  const setActiveTab = (tab: BuilderTab) => {
    router.replace(`/forms/${id}/edit?tab=${tab}`, { scroll: false });
  };
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Sprint 13 (CF2.12): touch-width builder UI — bottom-sheet toolbox and Reorder mode.
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const pages = useBuilderStore((state) => state.pages);
  const activePageId = useBuilderStore((state) => state.activePageId);
  const activeFieldId = useBuilderStore((state) => state.activeFieldId);
  const dirty = useBuilderStore((state) => state.dirty);
  const branding = useBuilderStore((state) => state.branding);
  const settings = useBuilderStore((state) => state.settings);
  const status = useBuilderStore((state) => state.status);
  const slug = useBuilderStore((state) => state.slug);
  
  const initForm = useBuilderStore((state) => state.initForm);
  const setFormTitle = useBuilderStore((state) => state.setFormTitle);
  const addField = useBuilderStore((state) => state.addField);
  const duplicateField = useBuilderStore((state) => state.duplicateField);
  const reorderFields = useBuilderStore((state) => state.reorderFields);
  const softDeleteField = useBuilderStore((state) => state.softDeleteField);
  const setActiveFieldId = useBuilderStore((state) => state.setActiveFieldId);
  const setActivePageId = useBuilderStore((state) => state.setActivePageId);
  const addPage = useBuilderStore((state) => state.addPage);
  const setPageTitle = useBuilderStore((state) => state.setPageTitle);
  const setPageDescription = useBuilderStore((state) => state.setPageDescription);
  const deletePage = useBuilderStore((state) => state.deletePage);
  const updateField = useBuilderStore((state) => state.updateField);
  const updateFieldOptions = useBuilderStore((state) => state.updateFieldOptions);
  const addLogicRule = useBuilderStore((state) => state.addLogicRule);
  const updateLogicRule = useBuilderStore((state) => state.updateLogicRule);
  const deleteLogicRule = useBuilderStore((state) => state.deleteLogicRule);
  const setBranding = useBuilderStore((state) => state.setBranding);
  const setSettings = useBuilderStore((state) => state.setSettings);
  const setStatus = useBuilderStore((state) => state.setStatus);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const undoStack = useBuilderStore((state) => state.undoStack);
  const redoStack = useBuilderStore((state) => state.redoStack);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
  });

  // Same lookup PersonalShell's sidebar already does (shares its cache, same query keys) — a
  // workspace-owned form's "back"/leave/delete destinations should return to that workspace's
  // own Forms list, not Personal space's, same reasoning as the sidebar context fix.
  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: !!form?.workspaceId,
  });
  const formWorkspaceSlug = form?.workspaceId
    ? workspaces.find((ws) => ws.id === form.workspaceId)?.slug
    : undefined;
  const formsListHref = formWorkspaceSlug ? `/w/${formWorkspaceSlug}/forms` : '/forms';
  // The header's back arrow returns to the form's own Overview (where the user came from), carrying the workspace hint.
  const overviewHref = `/forms/${id}/overview${formWorkspaceSlug ? `?ws=${formWorkspaceSlug}` : ''}`;
  // Personal form → the caller is its owner; workspace form → their membership role (unknown = no link).
  const formRole = form?.myRole ?? (form?.workspaceId ? workspaces.find((ws) => ws.id === form.workspaceId)?.role : 'owner');

  const formWorkspace = workspaces.find((ws) => ws.slug === formWorkspaceSlug);
  const breadcrumb: BreadcrumbItem[] = [
    formWorkspaceSlug
      ? { label: formWorkspace?.name ?? 'Workspace', href: `/w/${formWorkspaceSlug}` }
      : { label: 'Personal', href: '/dashboard' },
    { label: 'Forms', href: formsListHref },
    { label: formTitle || form?.title || 'Untitled form' },
  ];

  // A role that cannot edit has no business in the builder (the server rejects its writes anyway): send it to the read-only Overview.
  useEffect(() => {
    if (form?.myRole && !hasCapability(form.myRole, 'forms:edit')) router.replace(`/forms/${id}/overview`);
  }, [form?.myRole, id, router]);

  // Init builderStore state when query returns data. Guarded to run once per
  // form id — not on every query-cache update. Publish/close success handlers
  // call queryClient.setQueryData to patch status/slug into the cache, which
  // creates a new `form` object reference; without this guard that re-triggers
  // initForm() with the STALE data those handlers spread from (the original
  // GET response, never refreshed after autosave PATCHes), wiping out any
  // fields added since the form was first loaded.
  const initializedFormId = useRef<string | null>(null);
  useEffect(() => {
    if (form && initializedFormId.current !== form._id) {
      initializedFormId.current = form._id;
      initForm(form);
    }
  }, [form, initForm]);

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (error && !hasRedirected.current) {
      hasRedirected.current = true;
      toast('Form not found or access denied', 'error');
      router.push(formsListHref);
    }
  }, [error, router, toast, formsListHref]);

  // ─── Autosave ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dirty || !formId || formId === 'undefined') return;

    const timer = setTimeout(async () => {
      const hasEmptyChoiceOptions = fields.some(
        (f) =>
          !f.deleted &&
          (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') &&
          (!f.options || f.options.length === 0)
      );
      if (hasEmptyChoiceOptions) {
        setSaveState('error');
        return;
      }

      try {
        setSaveState('saving');
        await saveFormSnapshot(formId, { fields, formTitle, pages, branding, settings });
        markSaved();
        setSaveState('saved');
        setSavedAt(new Date());

        // Reset save state back to idle after showing success indicator for 2 seconds
        // idleTimerRef keeps this handle so the unmount cleanup below can cancel it
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          idleTimerRef.current = null;
          setSaveState('idle');
        }, 2000);
      } catch (err) {
        if (isAxiosError(err)) {
          console.error('Autosave failed:', err.response?.status, err.response?.data ?? err.message);
        } else {
          console.error('Autosave failed:', err);
        }
        setSaveState('error');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [dirty, fields, formTitle, pages, formId, branding, settings, markSaved]);

  // Cancel the idle reset timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Use refs to avoid re-binding and firing effect on every stroke
  const saveStateRef = useRef({ dirty, fields, formTitle, pages, formId, branding, settings });
  useEffect(() => {
    saveStateRef.current = { dirty, fields, formTitle, pages, formId, branding, settings };
  }, [dirty, fields, formTitle, pages, formId, branding, settings]);

  // Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y go through the store's undo/redo. Skipped while typing so
  // text inputs keep the browser's own text undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const k = e.key?.toLowerCase();
      if (!k) return;
      const store = useBuilderStore.getState();
      if (k === 'z' && !e.shiftKey) store.undo();
      else if ((k === 'z' && e.shiftKey) || k === 'y') store.redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Flush unsaved edits when the tab is hidden or the page is going away (autosave is a 2s debounce, so
  // the last edits would otherwise be lost). Same save path as autosave.
  useEffect(() => {
    const flush = () => {
      const c = saveStateRef.current;
      if (!c.dirty || !c.formId || c.formId === 'undefined') return;
      const hasEmptyChoice = c.fields.some(
        (f) => !f.deleted && (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') && !f.options?.length
      );
      if (hasEmptyChoice) return;
      saveFormSnapshot(c.formId, c).then(() => useBuilderStore.getState().markSaved()).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // Synchronous flush on unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStateRef.current.dirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      const current = saveStateRef.current;
      if (current.dirty && current.formId && current.formId !== 'undefined') {
        saveFormSnapshot(current.formId, current).catch(() => {});
      }
    };
  }, []);

  // ─── Publish flow ─────────────────────────────────────────────────────────────

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
  }, [dirty, formId, fields, formTitle, pages, branding, settings, markSaved, toast]);

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
  // copy instead of the stale GET the init effect above warns about.
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
  }, [dirty, formId, fields, formTitle, pages, branding, settings, markSaved, id, queryClient, router, toast]);

  // ─── Close form flow ──────────────────────────────────────────────────────────

  const closeMutation = useMutation({
    mutationFn: () => formsService.closeForm(formId!),
    onSuccess: () => {
      setStatus('closed');
      queryClient.setQueryData<Form>(['form', formId], (oldData) =>
        oldData ? { ...oldData, status: 'closed' } : oldData
      );
      setShowCloseModal(false);
      toast('Form closed. It will no longer accept new responses.', 'success');
    },
    onError: () => {
      toast('Failed to close form. Please try again.', 'error');
    },
  });

  // ─── Delete form flow ─────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => formsService.deleteForm(formId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      // Delete means Trash since Sprint 13 (CF5.5): reversible for 30 days.
      const id = formId!;
      const scope = formWorkspaceSlug ?? 'personal';
      toast(`"${formTitle}" moved to Trash`, 'success', undefined, {
        label: 'Undo',
        onClick: () => {
          trashService
            .restore(scope, 'form', id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              queryClient.invalidateQueries({ queryKey: ['trash'] });
              toast(`"${formTitle}" restored`, 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err, { action: `restore "${formTitle}"` }), 'error'));
        },
      });
      router.push(formsListHref);
    },
    onError: (err) => {
      toast(getFriendlyErrorMessage(err, { action: 'delete this form' }), 'error');
    },
  });

  // ─── Leave-Builder guard ──────────────────────────────────────────────────────

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

  // Retry after a failed autosave (SaveIndicator). A failed save leaves `dirty` true, so the leave
  // guard already treats it as unsaved; this just re-runs the same save immediately.
  const handleRetrySave = useCallback(async () => {
    const current = saveStateRef.current;
    if (!current.formId || current.formId === 'undefined') return;
    try {
      setSaveState('saving');
      await saveFormSnapshot(current.formId, current);
      markSaved();
      setSaveState('saved');
      setSavedAt(new Date());
    } catch {
      setSaveState('error');
      toast('Could not save. Please try again.', 'error');
    }
  }, [markSaved, toast]);

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

  // ─── DnD ─────────────────────────────────────────────────────────────────────

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ fieldId: string; position: 'above' | 'below' } | null>(null);
  // true when a toolbox item hovers over the canvas droppable (to tint the canvas)
  const [isToolboxOver, setIsToolboxOver] = useState(false);

  // Sensors: require 8px movement before drag activates (preserves click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Drag start: track which item is being dragged ────────────────────────
  // dropAnimation is set here (not derived from activeDragId state) so it
  // stays correct during the re-render triggered by setActiveDragId(null) in
  // handleDragEnd — otherwise activeDragId is already null and dnd-kit picks
  // up the default snap-back animation, flying the overlay to the toolbox.
  const [dropAnimation, setDropAnimation] = useState<null | undefined>(undefined);
  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setDropAnimation(id.startsWith('toolbox-') ? null : undefined);
    setActiveDragId(id);
  }

  // ─── Drag over: track exact insertion point for toolbox → canvas drops ────
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (active.data.current?.from !== 'toolbox') {
      setDragOverInfo(null);
      setIsToolboxOver(false);
      return;
    }

    if (!over) {
      setDragOverInfo(null);
      setIsToolboxOver(false);
      return;
    }

    // Hovering the empty canvas area — no per-field indicator, just canvas tint
    if (over.id === CANVAS_ID) {
      setDragOverInfo(null);
      setIsToolboxOver(true);
      return;
    }

    // Hovering over an existing FieldCard — compute above/below
    const position = isDroppingBelow(active, over) ? 'below' : 'above';

    setDragOverInfo({ fieldId: String(over.id), position });
    setIsToolboxOver(true);
  }

  // ─── Drag end: determine action based on source and over target ───────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    setDragOverInfo(null);
    setIsToolboxOver(false);

    if (!over) return;

    // Drop from toolbox → create new field on the currently active page
    if (active.data.current?.from === 'toolbox') {
      const type = active.data.current.type as FieldType;
      const overIndex = fields
        .filter((f) => !f.deleted && f.pageId === activePageId)
        .findIndex((f) => f.fieldId === over.id);

      if (overIndex !== -1) {
        const modifier = isDroppingBelow(active, over) ? 1 : 0;
        addField(type, overIndex + modifier);
      } else {
        addField(type);
      }
      return;
    }

    // Reorder existing canvas fields → sortable handles this
    if (
      active.data.current?.from === 'canvas' &&
      active.id !== over.id
    ) {
      reorderFields(active.id as string, over.id as string);
    }
  }

  // ─── DragOverlay preview content ───────────────────────────────────────────
  const activeDragConfig = activeDragId?.startsWith('toolbox-')
    ? FIELD_TYPE_CONFIG.find(
        (c) => `toolbox-${c.type}` === activeDragId
      )
    : null;

  // Reordering an existing canvas field → render a floating ghost of that card
  const activeDragField = !activeDragConfig
    ? fields.find((f) => f.fieldId === activeDragId)
    : null;
  const activeDragFieldConfig = activeDragField
    ? FIELD_TYPE_CONFIG.find((c) => c.type === activeDragField.type)
    : null;

  // Add-field sheet: append to the active page, expand the new card and scroll it into view
  // (addField itself does not select the field it creates).
  const handleAddFromSheet = (type: FieldType) => {
    addField(type);
    const state = useBuilderStore.getState();
    const pageId = state.activePageId ?? state.pages[0]?.id;
    const added = state.fields
      .filter((f) => !f.deleted && f.pageId === pageId)
      .sort((a, b) => a.order - b.order)
      .pop();
    if (!added) return;
    setActiveFieldId(added.fieldId);
    requestAnimationFrame(() =>
      document.querySelector(`[data-field-id="${added.fieldId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    );
  };

  const toggleReorder = () => {
    setIsReordering((on) => !on);
    setActiveFieldId(null); // the inline editor is hidden in Reorder mode; don't leave a field "selected"
  };
  const activePageFieldCount = fields.filter((f) => !f.deleted && f.pageId === activePageId).length;

  // Non-deleted field count per page, for the Pages panel's badges
  const pageFieldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    fields.forEach((f) => {
      if (!f.deleted) counts[f.pageId] = (counts[f.pageId] ?? 0) + 1;
    });
    return counts;
  }, [fields]);

  // The currently active page's own title/description — every page holds an
  // independent value (see builderStore's setPageTitle/setPageDescription).
  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  return (
    <>
      {/* -mx-4 md:-mx-8 xl:-mx-12 -mt-6 md:-mt-8 -mb-16 cancels AppShell's responsive content padding; calc offsets the fixed 56px TopNav — both needed so this fills the viewport exactly instead of overflowing it and forcing a page-level scrollbar. Canvas keeps its own internal overflow-y-auto below. */}
      <div className="flex flex-col h-[calc(100dvh-56px)] -mx-4 md:-mx-8 xl:-mx-12 -mt-6 md:-mt-8 -mb-16 overflow-hidden bg-(--bg-subtle)">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="flex flex-col h-full w-full">
            <div className="h-14 border-b bg-(--surface-card) flex items-center justify-between px-4 animate-pulse">
              <div className="h-6 bg-(--border-default) rounded w-48"></div>
              <div className="h-8 bg-(--border-default) rounded w-32"></div>
            </div>
            <div className="h-12 border-b bg-(--surface-card) animate-pulse"></div>
            <div className="flex-1 flex p-6 gap-6 animate-pulse max-w-7xl mx-auto w-full mt-10">
              <div className="w-70 bg-(--surface-card) border rounded-lg h-96"></div>
              <div className="flex-1 bg-(--surface-card) border rounded-lg h-96"></div>
              <div className="w-80 bg-(--surface-card) border rounded-lg h-96"></div>
            </div>
          </div>
        ) : (
          /* Form Builder Content */
          <>
            <Breadcrumb items={breadcrumb} className="shrink-0 border-b bg-(--surface-card) px-4 py-2" />
            <BuilderHeader
              formTitle={formTitle}
              dirty={dirty}
              isSaving={saveState === 'saving'}
              saveFailed={saveState === 'error'}
              savedAt={savedAt}
              onRetrySave={handleRetrySave}
              status={status}
              onTitleChange={setFormTitle}
              onPreview={handlePreview}
              onBack={handleBack}
              canPublish={canPublishForm(formRole)}
              onPublish={handlePublishClick}
              onClose={() => setShowCloseModal(true)}
              canDelete={canDeleteForm(formRole)}
              onDelete={() => setShowDeleteModal(true)}
            />

            <div className="shrink-0 border-b bg-(--surface-card) px-4 [&_.bg-tabs]:border-b-0">
              <FormSubNav formId={id} ws={formWorkspaceSlug} canEdit active={activeTab === 'settings' ? 'settings' : 'edit'} />
            </div>

            <BuilderTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              showShare={canSeeShare(formRole)}
              fieldCount={fields.filter((f) => !f.deleted).length}
            />
            
            <div className="flex flex-1 overflow-hidden">
              {activeTab === 'build' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={collisionDetection}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <Toolbox onAdd={addField} />
                  <PagesPanel
                    pages={pages}
                    activePageId={activePageId}
                    fieldCounts={pageFieldCounts}
                    onSelectPage={setActivePageId}
                    onAddPage={addPage}
                    onDeletePage={deletePage}
                  />
                  <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
                  <PageSwitcher pages={pages} activePageId={activePageId} onSelectPage={setActivePageId} />
                  <Canvas
                    fields={fields}
                    activePageId={activePageId}
                    pageTitle={activePage?.title ?? ''}
                    pageDescription={activePage?.description ?? ''}
                    onPageTitleChange={(title) => activePageId && setPageTitle(activePageId, title)}
                    onPageDescriptionChange={(description) => activePageId && setPageDescription(activePageId, description)}
                    activeFieldId={activeFieldId}
                    onFieldSelect={setActiveFieldId}
                    onFieldDelete={softDeleteField}
                    onFieldDuplicate={duplicateField}
                    onFieldReorder={reorderFields}
                    onFieldDeselect={() => setActiveFieldId(null)}
                    onFieldUpdate={updateField}
                    onFieldUpdateOptions={updateFieldOptions}
                    onAddLogicRule={addLogicRule}
                    onUpdateLogicRule={updateLogicRule}
                    onDeleteLogicRule={deleteLogicRule}
                    dragOverFieldId={dragOverInfo?.fieldId ?? null}
                    dragOverPosition={dragOverInfo?.position ?? null}
                    isToolboxOver={isToolboxOver}
                    isReordering={isReordering}
                  />
                  <MobileBuildBar
                    isReordering={isReordering}
                    canReorder={activePageFieldCount > 1}
                    onAddField={() => setShowAddSheet(true)}
                    onToggleReorder={toggleReorder}
                  />
                  </div>
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeDragConfig ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-(--surface-card) border border-(--border-focus) shadow-(--shadow-lg) opacity-90 min-h-11 cursor-grabbing pointer-events-none">
                        <activeDragConfig.icon size={16} className="text-(--action-primary) shrink-0" />
                        <span className="bg-body font-medium text-(--text-secondary)">
                          {activeDragConfig.label}
                        </span>
                      </div>
                    ) : activeDragField ? (
                      <div className="w-full flex items-center justify-between p-4 bg-(--surface-card) border border-(--border-default) rounded-lg min-h-14 cursor-grabbing pointer-events-none"
                        style={{ boxShadow: '0 8px 24px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08)', transform: 'scale(1.015)' }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <GripVertical size={16} className="text-(--text-disabled) shrink-0" />
                          {activeDragFieldConfig && (
                            <activeDragFieldConfig.icon size={16} className="text-(--text-muted) shrink-0" />
                          )}
                          <span className="bg-body font-medium text-(--text-primary) truncate pr-4">
                            {activeDragField.label}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : activeTab === 'branding' ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <BrandingTabContent
                    formId={formId ?? undefined}
                    formTitle={formTitle}
                    branding={branding}
                    settings={settings}
                    fieldCount={fields.filter((f) => !f.deleted).length}
                    isPublic={status === 'published' && settings.accessMode !== 'login'}
                    onBrandingUpdate={setBranding}
                    onLayoutChange={(layout) => setSettings({ layout })}
                  />
                </div>
              ) : activeTab === 'settings' ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <SettingsPanel settings={settings} status={status} slug={slug} onUpdate={setSettings} />
                </div>
              ) : activeTab === 'share' && canSeeShare(formRole) && formId ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <ShareView formId={formId} embedded onOpenPublish={handlePublishClick} />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      <AddFieldSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} onAdd={handleAddFromSheet} />

      {/* ── Lifecycle Modals ── */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        formId={formId ?? ''}
        formTitle={formTitle}
        status={status}
        slug={slug}
        settings={settings}
        scope={formWorkspaceSlug ?? 'personal'}
        canPublish={canPublishForm(formRole)}
        onStatusChange={handleStatusChange}
        onChangeSetting={handleChangeSetting}
        onFixField={handleFixField}
      />

      <CloseFormModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={() => closeMutation.mutate()}
        isPending={closeMutation.isPending}
      />

      <LeaveBuilderModal
        isOpen={showLeaveModal}
        formTitle={formTitle}
        onDiscard={handleLeaveWithoutSaving}
        onStay={handleStay}
      />

      <DeleteFormModal
        isOpen={showDeleteModal}
        formTitle={formTitle}
        responseCount={form?.responseCount}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteMutation.mutate();
          setShowDeleteModal(false);
        }}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
