'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useBuilderStore } from '@/store/builderStore';
import { FormSubNav } from '@/components/forms/FormSubNav';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { BuilderTabs, BuilderTab } from '@/components/form-builder/BuilderTabs';
import { SettingsPanel } from '@/components/form-builder/SettingsPanel';
import { AddFieldSheet } from '@/components/form-builder/AddFieldSheet';
import { BrandingTabContent } from '@/components/form-builder/BrandingTabContent';
import { ShareView } from '@/components/form-builder/ShareView';
import { PublishModal } from '@/components/form-builder/PublishModal';
import { CloseFormModal } from '@/components/form-builder/CloseFormModal';
import { LeaveBuilderModal } from '@/components/form-builder/LeaveBuilderModal';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { BuilderLoadingSkeleton } from '@/components/form-builder/BuilderLoadingSkeleton';
import { BuildTabPanel } from '@/components/form-builder/BuildTabPanel';
import { useBuilderForm } from '@/components/form-builder/useBuilderForm';
import { useBuilderAutosave } from '@/components/form-builder/useBuilderAutosave';
import { useBuilderUndoShortcuts } from '@/components/form-builder/useBuilderUndoShortcuts';
import { useBuilderPublishFlow } from '@/components/form-builder/useBuilderPublishFlow';
import { useBuilderFormMutations } from '@/components/form-builder/useBuilderFormMutations';
import { useBuilderLeaveGuard } from '@/components/form-builder/useBuilderLeaveGuard';
import { useBuilderDnd } from '@/components/form-builder/useBuilderDnd';
import { canSeeShare, canPublishForm, canDeleteForm } from '@/lib/roles';
import type { FieldType } from '@/types/form';

const VALID_TABS: BuilderTab[] = ['build', 'branding', 'settings', 'share'];

export default function BuilderPageShell() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();

  // The URL is the single source of truth for the active tab (?tab=settings), so the form sidebar's
  // Settings link, deep links, reload and the tab bar all agree. State copied from the URL once at mount
  // ignored in-page navigation (the sidebar link changed the URL but not the tab).
  const tabFromUrl = searchParams.get('tab') as BuilderTab | null;
  const activeTab: BuilderTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'build';
  const setActiveTab = (tab: BuilderTab) => {
    router.replace(`/forms/${id}/edit?tab=${tab}`, { scroll: false });
  };

  // Sprint 13 (CF2.12): touch-width builder UI — bottom-sheet toolbox and Reorder mode.
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const dirty = useBuilderStore((state) => state.dirty);
  const branding = useBuilderStore((state) => state.branding);
  const settings = useBuilderStore((state) => state.settings);
  const status = useBuilderStore((state) => state.status);
  const slug = useBuilderStore((state) => state.slug);

  const setFormTitle = useBuilderStore((state) => state.setFormTitle);
  const addField = useBuilderStore((state) => state.addField);
  const setActiveFieldId = useBuilderStore((state) => state.setActiveFieldId);
  const setBranding = useBuilderStore((state) => state.setBranding);
  const setSettings = useBuilderStore((state) => state.setSettings);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const undoStack = useBuilderStore((state) => state.undoStack);
  const redoStack = useBuilderStore((state) => state.redoStack);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const { form, isLoading, formWorkspaceSlug, formsListHref, overviewHref, formRole } = useBuilderForm(id);

  const { saveState, setSaveState, savedAt, handleRetrySave } = useBuilderAutosave();
  useBuilderUndoShortcuts();

  const { showPublishModal, setShowPublishModal, handleStatusChange, handlePublishClick, handleChangeSetting, handleFixField, handlePreview } =
    useBuilderPublishFlow({ id, setActiveTab, setSaveState });

  const { showCloseModal, setShowCloseModal, showDeleteModal, setShowDeleteModal, closeMutation, deleteMutation } =
    useBuilderFormMutations({ formWorkspaceSlug, formsListHref });

  const { showLeaveModal, handleBack, handleLeaveWithoutSaving, handleStay } = useBuilderLeaveGuard({ overviewHref, formsListHref });

  const dnd = useBuilderDnd();

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

  const nav = (
    <FormSubNav formId={id} ws={formWorkspaceSlug} canEdit active={activeTab === 'settings' ? 'settings' : 'edit'} />
  );
  const liveFieldCount = fields.filter((f) => !f.deleted).length;

  return (
    <>
      {isLoading ? (
        <BuilderLoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Same header and tab bar as Overview, Responses and Insights, so the frame never changes between them. */}
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
            nav={nav}
          />

          {activeTab === 'settings' ? (
            // Settings is an ordinary page, not part of the canvas: it scrolls with the page in a form-width column.
            <div className="flex max-w-160 flex-col gap-4">
              <SettingsPanel settings={settings} status={status} slug={slug} onUpdate={setSettings} />
            </div>
          ) : (
            // The builder lives in a framed panel that fills the rest of the viewport; the canvas and the side
            // panels scroll inside it, so the page itself does not.
            <div className="flex h-[calc(100dvh-19rem)] min-h-136 flex-col overflow-hidden rounded-2xl border border-(--border-default) bg-(--bg-subtle)">
              <BuilderTabs
                activeTab={activeTab}
                onChange={setActiveTab}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                showShare={canSeeShare(formRole)}
                fieldCount={liveFieldCount}
                hideSettings
              />

              <div className="flex flex-1 overflow-hidden">
                {activeTab === 'build' ? (
                  <BuildTabPanel
                    dnd={dnd}
                    isReordering={isReordering}
                    onAddField={() => setShowAddSheet(true)}
                    onToggleReorder={toggleReorder}
                  />
                ) : activeTab === 'branding' ? (
                  <div className="flex-1 overflow-y-auto p-6">
                    <BrandingTabContent
                      formId={formId ?? undefined}
                      formTitle={formTitle}
                      branding={branding}
                      settings={settings}
                      fieldCount={liveFieldCount}
                      isPublic={status === 'published' && settings.accessMode !== 'login'}
                      onBrandingUpdate={setBranding}
                      onLayoutChange={(layout) => setSettings({ layout })}
                    />
                  </div>
                ) : activeTab === 'share' && canSeeShare(formRole) && formId ? (
                  <div className="flex-1 overflow-y-auto p-6">
                    <ShareView formId={formId} embedded onOpenPublish={handlePublishClick} />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

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
