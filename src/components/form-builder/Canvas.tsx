'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { Layout } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldCard } from './FieldCard';
import { CanvasFormHeader } from './CanvasFormHeader';

// ─── Canvas droppable ID ─────────────────────────────────────────────────────
export const CANVAS_ID = 'builder-canvas';

// ─── Droppable canvas inner component ────────────────────────────────────────
function DroppableCanvas({
  children,
  isEmpty,
  isOver,
  fieldCount,
  pageTitle,
  pageDescription,
  onPageTitleChange,
  onPageDescriptionChange,
  onBackgroundClick,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  fieldCount: number;
  pageTitle: string;
  pageDescription: string;
  onPageTitleChange: (title: string) => void;
  onPageDescriptionChange: (description: string) => void;
  onBackgroundClick: () => void;
}) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({ id: CANVAS_ID });
  const showOver = isOver || droppableIsOver;

  return (
    <main
      ref={setNodeRef}
      onClick={onBackgroundClick}
      className={`flex-1 min-w-0 rounded-xl py-2 transition-colors duration-200 min-h-125 ${
        showOver ? 'bg-(--accent-soft)/50' : ''
      }`}
    >
      {/* Widened from the design system's 440px baseline — with live field previews now
          rendered inline, 440px felt cramped. 560px gives more breathing room without
          spanning the full canvas width. */}
      <div className="max-w-4xl mx-auto min-h-125 flex flex-col justify-start">
        {/* Title + description header — always visible, regardless of field count */}
        <CanvasFormHeader
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          fieldCount={fieldCount}
          onPageTitleChange={onPageTitleChange}
          onPageDescriptionChange={onPageDescriptionChange}
        />

        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <EmptyState illustration="build-form"
              icon={<Layout />}
              title="Start building your form"
              description={
                showOver
                  ? 'Release to drop the field here!'
                  : 'Pick a field type from the toolbox to add your first question.'
              }
            />
          </div>
        ) : (
          children
        )}
      </div>
    </main>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CanvasProps {
  fields: FormField[];
  activePageId: string | null;
  pageTitle: string;
  pageDescription: string;
  onPageTitleChange: (title: string) => void;
  onPageDescriptionChange: (description: string) => void;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
  onFieldReorder: (activeId: string, overId: string) => void;
  onFieldDeselect: () => void;
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onFieldUpdateOptions: (fieldId: string, options: string[]) => void;
  onAddLogicRule: (fieldId: string, rule: LogicRule) => void;
  onUpdateLogicRule: (oldFieldId: string, oldRuleIndex: number, newFieldId: string, rule: LogicRule) => void;
  onDeleteLogicRule: (fieldId: string, ruleIndex: number) => void;
  /** Which field (if any) a toolbox item is currently hovering over, and on which side */
  dragOverFieldId?: string | null;
  dragOverPosition?: 'above' | 'below' | null;
  /** Whether a toolbox item is currently being dragged over the canvas area */
  isToolboxOver?: boolean;
  /** Sprint 13 (CF2.12) — Reorder mode on touch widths. */
  isReordering?: boolean;
}

// ─── Main Canvas component ────────────────────────────────────────────────────
export function Canvas({
  fields,
  activePageId,
  pageTitle,
  pageDescription,
  onPageTitleChange,
  onPageDescriptionChange,
  activeFieldId,
  onFieldSelect,
  onFieldDelete,
  onFieldDuplicate,
  onFieldReorder,
  onFieldDeselect,
  onFieldUpdate,
  onFieldUpdateOptions,
  onAddLogicRule,
  onUpdateLogicRule,
  onDeleteLogicRule,
  dragOverFieldId = null,
  dragOverPosition = null,
  isToolboxOver = false,
  isReordering = false,
}: CanvasProps) {
  // Screen-reader announcement of a Reorder-mode move (aria-live) — the new position is spoken, not
  // only shown.
  const [announcement, setAnnouncement] = useState('');
  // Only the active page's fields are ever shown on the canvas at once.
  const visibleFields = fields.filter((f) => !f.deleted && f.pageId === activePageId);
  const visibleFieldIds = visibleFields.map((f) => f.fieldId);

  function moveBy(index: number, delta: -1 | 1) {
    const target = visibleFields[index + delta];
    const moved = visibleFields[index];
    if (!target || !moved) return;
    onFieldReorder(moved.fieldId, target.fieldId);
    setAnnouncement(`Moved ${moved.label} to position ${index + delta + 1} of ${visibleFields.length}`);
    // React moves the keyed node, which can drop focus — put it back on the button just used.
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-field-id="${moved.fieldId}"] [data-move="${delta < 0 ? 'up' : 'down'}"]`)
        ?.focus();
    });
  }

  return (
    <div className="flex flex-1 min-h-0 w-full min-w-0" style={{ overflow: 'visible' }}>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <DroppableCanvas
        isEmpty={visibleFields.length === 0}
        isOver={isToolboxOver}
        fieldCount={visibleFields.length}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        onPageTitleChange={onPageTitleChange}
        onPageDescriptionChange={onPageDescriptionChange}
        onBackgroundClick={onFieldDeselect}
      >
        <SortableContext
          items={visibleFieldIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {visibleFields.map((field, index) => (
              <FieldCard
                key={field.fieldId}
                field={field}
                allFields={fields}
                isActive={activeFieldId === field.fieldId}
                onSelect={() => (activeFieldId === field.fieldId ? onFieldDeselect() : onFieldSelect(field.fieldId))}
                onDelete={() => onFieldDelete(field.fieldId)}
                onDuplicate={() => onFieldDuplicate(field.fieldId)}
                onUpdate={onFieldUpdate}
                onUpdateOptions={onFieldUpdateOptions}
                onAddLogicRule={onAddLogicRule}
                onUpdateLogicRule={onUpdateLogicRule}
                onDeleteLogicRule={onDeleteLogicRule}
                onMoveUp={index > 0 ? () => moveBy(index, -1) : undefined}
                onMoveDown={index < visibleFields.length - 1 ? () => moveBy(index, 1) : undefined}
                reorderMode={isReordering}
                insertIndicator={dragOverFieldId === field.fieldId ? dragOverPosition : null}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableCanvas>
    </div>
  );
}
