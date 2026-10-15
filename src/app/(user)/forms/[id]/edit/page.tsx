'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useBuilderStore } from '@/store/builderStore';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { FormLogoButton } from '@/components/forms/FormLogoButton';
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
  // Arriving from the guest builder's claim: say where the form is and offer the one next step.
  const justClaimed = searchParams.get('claimed') === '1';
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

  const liveFieldCount = fields.filter((f) => !f.deleted).length;

  return (
    <>
      {isLoading ? (
        <BuilderLoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          {justClaimed && status === 'draft' && (
            <Alert variant="success" title="Your form is saved. Publish it to get a link">
              <div className="mt-2">
                <Button size="small" onClick={handlePublishClick}>Publish</Button>
              </div>
            </Alert>
          )}
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
            canPublish={canPublishForm(formRole)}
            onPublish={handlePublishClick}
            onClose={() => setShowCloseModal(true)}
            canDelete={canDeleteForm(formRole)}
            onDelete={() => setShowDeleteModal(true)}
            onBack={handleBack}
            onOpenSettings={() => setActiveTab('settings')}
            // Same logo as Branding → Logo: it goes through the builder store, so it autosaves like every other edit.
            icon={<FormLogoButton mark={branding} title={formTitle} canEdit={formRole !== 'viewer' && formRole !== 'reviewer'} onSave={(mark) => setBranding({ logoUrl: mark.logoUrl ?? undefined, iconName: mark.iconName ?? undefined})} />}
          />

          {activeTab === 'settings' ? (
            // Settings is an ordinary page, not part of the canvas: it scrolls with the page in a form-width column.
            <div className="flex flex-col gap-4">
              <Button variant="ghost" size="small" className="self-start" onClick={() => setActiveTab('build')}>
                <ArrowLeft size={16} className="mr-1.5" aria-hidden="true" />
                Back to editor
              </Button>
              <SettingsPanel settings={settings} status={status} slug={slug} onUpdate={setSettings} />
            </div>
          ) : (
            // Unframed: tabs, then the field rail and canvas flow on the page itself, which scrolls as a whole.
            <div className="flex flex-col gap-4">
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

              <div className="flex items-start gap-6">
                {activeTab === 'build' ? (
                  <BuildTabPanel
                    dnd={dnd}
                    isReordering={isReordering}
                    onAddField={() => setShowAddSheet(true)}
                    onToggleReorder={toggleReorder}
                  />
                ) : activeTab === 'branding' ? (
                  <div className="min-w-0 flex-1">
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
                  <div className="min-w-0 flex-1">
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
