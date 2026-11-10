'use client';

import { usePendingEdits } from '@/lib/pendingEdits';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useBuilderStore } from '@/store/builderStore';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { FormLogoButton } from '@/components/forms/FormLogoButton';
import { BuilderTabs, type BuilderTab, type BuilderTarget } from '@/components/form-builder/BuilderTabs';
import { SettingsPanel } from '@/components/form-builder/SettingsPanel';
import { AddFieldSheet } from '@/components/form-builder/AddFieldSheet';
import { BrandingTabContent } from '@/components/form-builder/BrandingTabContent';
import { ShareView } from '@/components/form-builder/ShareView';
import { PublishModal } from '@/components/form-builder/PublishModal';
import { LeaveBuilderModal } from '@/components/form-builder/LeaveBuilderModal';
import { BuilderLoadingSkeleton } from '@/components/form-builder/BuilderLoadingSkeleton';
import { BuildTabPanel } from '@/components/form-builder/BuildTabPanel';
import { useBuilderForm } from '@/components/form-builder/useBuilderForm';
import { reloadBuilder, useBuilderAutosave } from '@/components/form-builder/useBuilderAutosave';
import { useBuilderUndoShortcuts } from '@/components/form-builder/useBuilderUndoShortcuts';
import { useBuilderPublishFlow } from '@/components/form-builder/useBuilderPublishFlow';
import { useBuilderLeaveGuard } from '@/components/form-builder/useBuilderLeaveGuard';
import { useBuilderDnd } from '@/components/form-builder/useBuilderDnd';
import { canSeeShare, canPublishForm } from '@/lib/roles';
import type { FieldType } from '@/types/form';

const VALID_TABS: BuilderTab[] = ['build', 'branding', 'settings'];

export default function BuilderPageShell() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();

  // The URL is the single source of truth for the active tab (?tab=settings), so the form sidebar's
  // Settings link, deep links, reload and the tab bar all agree. State copied from the URL once at mount
  // ignored in-page navigation (the sidebar link changed the URL but not the tab).
  const tabFromUrl = searchParams.get('tab');
  // Arriving from the guest builder's claim: say where the form is and offer the one next step.
  const justClaimed = searchParams.get('claimed') === '1';
  // Settings is the tab (Settings first, Share & Embed below it — not the other way around). ?tab=share (the old tab
  // name, the "Share & embed" links in PublishModal/ResponsesTable/ResponsesLoadErrors) opens the Settings tab scrolled
  // down to the Share & Embed section; ?tab=settings and the tab itself open it at the top, where Settings now lives.
  const wantsShare = tabFromUrl === 'share';
  const activeTab: BuilderTab = wantsShare ? 'settings' : VALID_TABS.includes(tabFromUrl as BuilderTab) ? (tabFromUrl as BuilderTab) : 'build';
  // A ref, not state: the publish flow keeps setActiveTab in a callback with no dependencies, so the scroll must not read the current tab.
  const shareRef = useRef<HTMLDivElement>(null);
  const settingsTopRef = useRef<HTMLDivElement>(null);
  const scrollToShare = (behavior: ScrollBehavior) => shareRef.current?.scrollIntoView({ block: 'start', behavior });
  const setActiveTab = (tab: BuilderTarget) => {
    router.replace(`/forms/${id}/edit?tab=${tab}`, { scroll: false });
    // Already on the tab, the URL may not change, so nothing below re-runs: scroll now. From another tab the section
    // is not mounted yet and this is a no-op; the effect below scrolls once it is.
    if (tab === 'share') requestAnimationFrame(() => scrollToShare('smooth'));
  };

  // Sprint 13 (CF2.12): touch-width builder UI — bottom-sheet toolbox and Reorder mode.
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  // Typed-but-uncommitted text counts as unsaved too: the store is not dirty until a debounce fires (QA D3-001).
  const storeDirty = useBuilderStore((state) => state.dirty);
  const hasPending = usePendingEdits(); // always called: a hook must never sit behind a short-circuit
  const dirty = storeDirty || hasPending;
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

  const { isLoading, formWorkspaceSlug, formsListHref, overviewHref, formRole } = useBuilderForm(id);

  // Landing on ?tab=share (or switching to it from another tab): the section exists once the builder has loaded.
  useEffect(() => {
    if (wantsShare && !isLoading) shareRef.current?.scrollIntoView({ block: 'start' });
  }, [wantsShare, isLoading]);

  const { saveState, setSaveState, savedAt, saveDetail, handleRetrySave } = useBuilderAutosave();
  const stale = useBuilderStore((state) => state.stale);
  const unsavedCount = useBuilderStore((state) => Math.max(1, state.undoStack.length - state.savedUndoDepth));
  useBuilderUndoShortcuts();

  const { showPublishModal, setShowPublishModal, handleStatusChange, handlePublishClick, handleChangeSetting, handleFixField, handlePreview, handlePreviewInNewTab } =
    useBuilderPublishFlow({ id, setActiveTab, setSaveState });

  const { showLeaveModal, handleBack, handleLeaveWithoutSaving, handleStay } = useBuilderLeaveGuard({ overviewHref, formsListHref });

  const dnd = useBuilderDnd();

  // Add-field sheet: append to the active page. The store opens the new card and FieldCard scrolls it into view.
  const handleAddFromSheet = (type: FieldType) => addField(type);

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
            saveDetail={saveDetail}
            saveConflict={stale}
            unsavedCount={unsavedCount}
            onReload={reloadBuilder}
            savedAt={savedAt}
            onRetrySave={handleRetrySave}
            status={status}
            onTitleChange={setFormTitle}
            onPreview={handlePreview}
            canPublish={canPublishForm(formRole)}
            onPublish={handlePublishClick}
            onBack={handleBack}
            // Same logo as Branding → Logo: it goes through the builder store, so it autosaves like every other edit.
            icon={<FormLogoButton mark={branding} title={formTitle} canEdit={formRole !== 'viewer' && formRole !== 'reviewer'} onSave={(mark) => setBranding({ logoUrl: mark.logoUrl ?? undefined, iconName: mark.iconName ?? undefined})} />}
          />

          {/* Unframed: tabs, then the field rail and canvas flow on the page itself, which scrolls as a whole. */}
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
                      onFullScreen={handlePreviewInNewTab}
                      onTitleChange={setFormTitle}
                      styleScope={formWorkspaceSlug ?? 'personal'}
                    />
                  </div>
                ) : activeTab === 'settings' ? (
                  // Settings: the tab's own content, first and at the top. Share & Embed lives below it — a form's
                  // settings are what someone comes to this tab for; distribution is secondary once a form is live.
                  // Reviewers cannot share, so they get only Settings. It scrolls with the page like any other.
                  <div className="flex min-w-0 flex-1 flex-col gap-12">
                    <div ref={settingsTopRef} className="scroll-mt-24">
                      <SettingsPanel settings={settings} onUpdate={setSettings} />
                    </div>
                    {canSeeShare(formRole) && formId && (
                      <div ref={shareRef} id="form-share" className="scroll-mt-24">
                        <ShareView
                          formId={formId}
                          embedded
                          onOpenPublish={handlePublishClick}
                          onOpenSettings={() => settingsTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
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

      <LeaveBuilderModal
        isOpen={showLeaveModal}
        formTitle={formTitle}
        onDiscard={handleLeaveWithoutSaving}
        onStay={handleStay}
      />
    </>
  );
}
