'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Layout } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { EmptyState } from '@/components/common/EmptyState';
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
      className={`flex-1 min-w-0 p-6 overflow-y-auto transition-colors duration-200 min-h-[500px] ${
        showOver ? 'bg-brand-50/50' : 'bg-neutral-50'
      }`}
    >
      {/* Widened from the design system's 440px baseline — with live field previews now
          rendered inline, 440px felt cramped. 560px gives more breathing room without
          spanning the full canvas width. */}
      <div className="max-w-[560px] mx-auto min-h-[500px] flex flex-col justify-start">
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
            <EmptyState
              icon={<Layout />}
              heading="Start building your form"
              body={
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
}: CanvasProps) {
  // Only the active page's fields are ever shown on the canvas at once.
  const visibleFields = fields.filter((f) => !f.deleted && f.pageId === activePageId);
  const visibleFieldIds = visibleFields.map((f) => f.fieldId);

  return (
    <div className="flex flex-1 w-full min-w-0" style={{ overflow: 'visible' }}>
      {/* Center Droppable Canvas */}
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
                onSelect={() => onFieldSelect(field.fieldId)}
                onDelete={() => onFieldDelete(field.fieldId)}
                onDuplicate={() => onFieldDuplicate(field.fieldId)}
                onUpdate={onFieldUpdate}
                onUpdateOptions={onFieldUpdateOptions}
                onAddLogicRule={onAddLogicRule}
                onUpdateLogicRule={onUpdateLogicRule}
                onDeleteLogicRule={onDeleteLogicRule}
                onMoveUp={index > 0 ? () => onFieldReorder(field.fieldId, visibleFields[index - 1].fieldId) : undefined}
                onMoveDown={
                  index < visibleFields.length - 1
                    ? () => onFieldReorder(field.fieldId, visibleFields[index + 1].fieldId)
                    : undefined
                }
                insertIndicator={dragOverFieldId === field.fieldId ? dragOverPosition : null}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableCanvas>
    </div>
  );
}
