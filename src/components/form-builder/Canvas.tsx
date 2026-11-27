'use client';

import { useDndMonitor, useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useRef, useState } from 'react';
import { Layout } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldCard } from './FieldCard';
import { CanvasFormHeader } from './CanvasFormHeader';

// Canvas droppable ID
export const CANVAS_ID = 'builder-canvas';

// Droppable canvas inner component
function DroppableCanvas({
  children,
  isEmpty,
  isOver,
  pageNumber,
  pageTitle,
  pageDescription,
  onPageTitleChange,
  onPageDescriptionChange,
  onBackgroundClick,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  pageNumber: number;
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
      {/* The form column stops at 760px: wider lines are harder to read, and the respondent's form is narrower still. */}
      <div className="max-w-190 mx-auto min-h-125 flex flex-col justify-start">
        {/* Title + description header — always visible, regardless of field count */}
        <CanvasFormHeader
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          pageNumber={pageNumber}
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

// Props
interface CanvasProps {
  fields: FormField[];
  activePageId: string | null;
  /** The active page's position, from 1. */
  pageNumber?: number;
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

// Main Canvas component
export function Canvas({
  fields,
  activePageId,
  pageNumber = 1,
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
  // Screen-reader announcement of a keyboard (Alt+Arrow) move: the new position is spoken, not only shown.
  const [announcement, setAnnouncement] = useState('');
  // Only the active page's fields are ever shown on the canvas at once.
  const visibleFields = fields.filter((f) => !f.deleted && f.pageId === activePageId);
  const visibleFieldIds = visibleFields.map((f) => f.fieldId);

  // A card picked up shrinks to a slim outline. The list keeps its height until just after the drop: a page that got
  // shorter mid-drag moved the scroll, so everything jumped under the pointer.
  const listRef = useRef<HTMLDivElement>(null);
  const release = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holdHeight = () => {
    clearTimeout(release.current);
    const list = listRef.current;
    if (list) list.style.minHeight = `${list.offsetHeight}px`;
  };
  const releaseHeight = () => {
    release.current = setTimeout(() => {
      if (listRef.current) listRef.current.style.minHeight = '';
    }, 400);
  };
  useDndMonitor({ onDragStart: holdHeight, onDragEnd: releaseHeight, onDragCancel: releaseHeight });

  function moveBy(index: number, delta: -1 | 1) {
    const target = visibleFields[index + delta];
    const moved = visibleFields[index];
    if (!target || !moved) return;
    onFieldReorder(moved.fieldId, target.fieldId);
    setAnnouncement(`Moved ${moved.label} to position ${index + delta + 1} of ${visibleFields.length}`);
  }

  return (
    <div className="flex flex-1 min-h-0 w-full min-w-0" style={{ overflow: 'visible' }}>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <DroppableCanvas
        isEmpty={visibleFields.length === 0}
        isOver={isToolboxOver}
        pageNumber={pageNumber}
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
          <div ref={listRef} className="space-y-3">
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
                insertIndicator={dragOverFieldId === field.fieldId ? dragOverPosition : null}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableCanvas>
    </div>
  );
}
