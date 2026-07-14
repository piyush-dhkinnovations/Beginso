'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Layout } from 'lucide-react';
import type { FormField } from '@/types/form';
import { EmptyState } from '@/components/common/EmptyState';
import { FieldCard } from './FieldCard';

// ─── Canvas droppable ID ─────────────────────────────────────────────────────
export const CANVAS_ID = 'builder-canvas';

// ─── Droppable canvas inner component ────────────────────────────────────────
function DroppableCanvas({
  children,
  isEmpty,
  isOver,
  fieldCount,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  fieldCount: number;
}) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({ id: CANVAS_ID });
  const showOver = isOver || droppableIsOver;

  return (
    <main
      ref={setNodeRef}
      className={`flex-1 min-w-0 p-6 overflow-y-auto transition-colors duration-200 min-h-[500px] ${
        showOver ? 'bg-brand-50/50' : 'bg-neutral-50'
      }`}
    >
      {/* Design system: "Builder canvas: max-width 440px within canvas panel" */}
      <div className="max-w-[440px] mx-auto min-h-[500px] flex flex-col justify-start">
        {!isEmpty && (
          <p className="text-sm text-neutral-400 font-semibold mb-3">
              {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
          </p>
        )}
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <EmptyState
              icon={<Layout />}
              heading="Add your first field"
              body={
                showOver
                  ? 'Release to drop the field here!'
                  : 'Drag a field type from the toolbox on the left, or click to insert.'
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
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
  onFieldReorder: (activeId: string, overId: string) => void;
  /** Which field (if any) a toolbox item is currently hovering over, and on which side */
  dragOverFieldId?: string | null;
  dragOverPosition?: 'above' | 'below' | null;
  /** Whether a toolbox item is currently being dragged over the canvas area */
  isToolboxOver?: boolean;
}

// ─── Main Canvas component ────────────────────────────────────────────────────
export function Canvas({
  fields,
  activeFieldId,
  onFieldSelect,
  onFieldDelete,
  onFieldDuplicate,
  onFieldReorder,
  dragOverFieldId = null,
  dragOverPosition = null,
  isToolboxOver = false,
}: CanvasProps) {
  const visibleFields = fields.filter((f) => !f.deleted);
  const visibleFieldIds = visibleFields.map((f) => f.fieldId);

  return (
    <div className="flex flex-1 w-full min-w-0" style={{ overflow: 'visible' }}>
      {/* Center Droppable Canvas */}
      <DroppableCanvas isEmpty={visibleFields.length === 0} isOver={isToolboxOver} fieldCount={visibleFields.length}>
        <SortableContext
          items={visibleFieldIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {visibleFields.map((field, index) => (
              <FieldCard
                key={field.fieldId}
                field={field}
                isActive={activeFieldId === field.fieldId}
                onSelect={() => onFieldSelect(field.fieldId)}
                onDelete={() => onFieldDelete(field.fieldId)}
                onDuplicate={() => onFieldDuplicate(field.fieldId)}
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
