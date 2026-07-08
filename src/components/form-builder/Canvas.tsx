'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Layout } from 'lucide-react';
import { useState } from 'react';
import type { FieldType, FormField } from '@/types/form';
import { EmptyState } from '@/components/common/EmptyState';
import { FieldCard } from './FieldCard';
import { FIELD_TYPE_CONFIG, Toolbox } from './Toolbox';

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
  onFieldsReorder: (activeId: string, overId: string) => void;
  onFieldDrop: (type: FieldType) => void;
}

// ─── Main Canvas component ────────────────────────────────────────────────────
export function Canvas({
  fields,
  activeFieldId,
  onFieldSelect,
  onFieldDelete,
  onFieldsReorder,
  onFieldDrop,
}: CanvasProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Sensors: require 8px movement before drag activates (preserves click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleFields = fields.filter((f) => !f.deleted);
  const visibleFieldIds = visibleFields.map((f) => f.fieldId);

  // ─── Drag start: track which item is being dragged ────────────────────────
  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  // ─── Drag end: determine action based on source and over target ───────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    // Drop from toolbox → must land on CANVAS_ID
    if (
      active.data.current?.from === 'toolbox' &&
      over.id === CANVAS_ID
    ) {
      onFieldDrop(active.data.current.type as FieldType);
      return;
    }

    // Reorder existing canvas fields → sortable handles this
    if (
      active.data.current?.from === 'canvas' &&
      active.id !== over.id
    ) {
      onFieldsReorder(active.id as string, over.id as string);
    }
  }

  // ─── DragOverlay preview label ─────────────────────────────────────────────
  const activeDragConfig = activeDragId?.startsWith('toolbox-')
    ? FIELD_TYPE_CONFIG.find(
        (c) => `toolbox-${c.type}` === activeDragId
      )
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* ── Layout ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 w-full" style={{ overflow: 'visible' }}>
        {/* Left Toolbox — inside DndContext so draggables share the context */}
        <Toolbox onAdd={onFieldDrop} />

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

        {/* Right properties panel placeholder */}
        <div className="w-[320px] border-l bg-white flex items-center justify-center p-6 text-neutral-400 text-body text-center shrink-0">
          Properties Panel Coming in Friday Tasks
        </div>
      </div>

      {/* ── Drag Overlay: floating preview under the cursor ─────────────────── */}
      <DragOverlay dropAnimation={null}>
        {activeDragConfig ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-blue-400 shadow-lg opacity-90 min-h-[44px] cursor-grabbing pointer-events-none">
            <activeDragConfig.icon size={18} className="text-blue-500 shrink-0" />
            <span className="text-body font-medium text-neutral-700">
              {activeDragConfig.label}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
