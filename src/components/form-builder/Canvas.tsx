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
const CANVAS_ID = 'builder-canvas';

// ─── Droppable canvas inner component ────────────────────────────────────────
function DroppableCanvas({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_ID });

  return (
    <main
      ref={setNodeRef}
      className={`flex-1 p-6 overflow-y-auto transition-colors duration-150 min-h-[500px] ${
        isOver ? 'bg-blue-50/60' : 'bg-neutral-50'
      }`}
    >
      <div className="max-w-xl mx-auto min-h-[500px] flex flex-col justify-start">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <EmptyState
              icon={<Layout />}
              heading="Add your first field"
              body={
                isOver
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
}

// ─── Main Canvas component ────────────────────────────────────────────────────
export function Canvas({
  fields,
  activeFieldId,
  onFieldSelect,
  onFieldDelete,
}: CanvasProps) {
  const visibleFields = fields.filter((f) => !f.deleted);
  const visibleFieldIds = visibleFields.map((f) => f.fieldId);

  return (
    <div className="flex flex-1 w-full" style={{ overflow: 'visible' }}>
      {/* Center Droppable Canvas */}
      <DroppableCanvas isEmpty={visibleFields.length === 0}>
        <SortableContext
          items={visibleFieldIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {visibleFields.map((field) => (
              <FieldCard
                key={field.fieldId}
                field={field}
                isActive={activeFieldId === field.fieldId}
                onSelect={() => onFieldSelect(field.fieldId)}
                onDelete={() => onFieldDelete(field.fieldId)}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableCanvas>
    </div>
  );
}
