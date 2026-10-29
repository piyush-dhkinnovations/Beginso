'use client';

import { useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useBuilderStore } from '@/store/builderStore';
import { Canvas } from './Canvas';
import { PagesPanel, PageSwitcher } from './PagesPanel';
import { Toolbox } from './Toolbox';
import { MobileBuildBar } from './MobileBuildBar';
import type { BuilderDnd } from './useBuilderDnd';

// The Build tab: toolbox, pages panel, canvas and the drag overlay inside one DndContext.
export function BuildTabPanel({
  dnd,
  isReordering,
  onAddField,
  onToggleReorder,
}: {
  dnd: BuilderDnd;
  isReordering: boolean;
  onAddField: () => void;
  onToggleReorder: () => void;
}) {
  const fields = useBuilderStore((state) => state.fields);
  const pages = useBuilderStore((state) => state.pages);
  const activePageId = useBuilderStore((state) => state.activePageId);
  const activeFieldId = useBuilderStore((state) => state.activeFieldId);

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

  const { activeDragConfig, activeDragField, activeDragFieldConfig } = dnd;

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
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={dnd.collisionDetection}
      onDragStart={dnd.handleDragStart}
      onDragOver={dnd.handleDragOver}
      onDragEnd={dnd.handleDragEnd}
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
      <div className="flex min-w-0 flex-1 flex-col">
      <PageSwitcher pages={pages} activePageId={activePageId} onSelectPage={setActivePageId} onAddPage={addPage} />
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
        dragOverFieldId={dnd.dragOverInfo?.fieldId ?? null}
        dragOverPosition={dnd.dragOverInfo?.position ?? null}
        isToolboxOver={dnd.isToolboxOver}
        isReordering={isReordering}
      />
      <MobileBuildBar
        isReordering={isReordering}
        canReorder={activePageFieldCount > 1}
        onAddField={onAddField}
        onToggleReorder={onToggleReorder}
      />
      </div>
      <DragOverlay dropAnimation={dnd.dropAnimation}>
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
  );
}
