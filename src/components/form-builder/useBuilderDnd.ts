import { useState } from 'react';
import {
  Active,
  closestCenter,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  Over,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBuilderStore } from '@/store/builderStore';
import { CANVAS_ID } from './Canvas';
import { FIELD_TYPE_CONFIG } from './Toolbox';
import type { FieldType } from '@/types/form';

// Shared by handleDragOver (visual indicator) and handleDragEnd (actual insert)
// so the two never disagree about which side of the hovered card the drag is on.
function isDroppingBelow(active: Active, over: Over | null): boolean {
  return Boolean(
    active.rect.current.translated &&
    over?.rect &&
    active.rect.current.translated.top > over.rect.top + over.rect.height / 2
  );
}

// pointerWithin needs pointer coordinates, which a keyboard drag does not have: without this fallback
// a keyboard reorder never finds a drop target and silently does nothing.
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

export function useBuilderDnd() {
  const fields = useBuilderStore((state) => state.fields);
  const activePageId = useBuilderStore((state) => state.activePageId);
  const addField = useBuilderStore((state) => state.addField);
  const reorderFields = useBuilderStore((state) => state.reorderFields);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ fieldId: string; position: 'above' | 'below' } | null>(null);
  // true when a toolbox item hovers over the canvas droppable (to tint the canvas)
  const [isToolboxOver, setIsToolboxOver] = useState(false);

  // Sensors: require 8px movement before drag activates (preserves click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Drag start: track which item is being dragged ────────────────────────
  // dropAnimation is set here (not derived from activeDragId state) so it
  // stays correct during the re-render triggered by setActiveDragId(null) in
  // handleDragEnd — otherwise activeDragId is already null and dnd-kit picks
  // up the default snap-back animation, flying the overlay to the toolbox.
  const [dropAnimation, setDropAnimation] = useState<null | undefined>(undefined);
  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setDropAnimation(id.startsWith('toolbox-') ? null : undefined);
    setActiveDragId(id);
  }

  // ─── Drag over: track exact insertion point for toolbox → canvas drops ────
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (active.data.current?.from !== 'toolbox') {
      setDragOverInfo(null);
      setIsToolboxOver(false);
      return;
    }

    if (!over) {
      setDragOverInfo(null);
      setIsToolboxOver(false);
      return;
    }

    // Hovering the empty canvas area — no per-field indicator, just canvas tint
    if (over.id === CANVAS_ID) {
      setDragOverInfo(null);
      setIsToolboxOver(true);
      return;
    }

    // Hovering over an existing FieldCard — compute above/below
    const position = isDroppingBelow(active, over) ? 'below' : 'above';

    setDragOverInfo({ fieldId: String(over.id), position });
    setIsToolboxOver(true);
  }

  // ─── Drag end: determine action based on source and over target ───────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    setDragOverInfo(null);
    setIsToolboxOver(false);

    if (!over) return;

    // Drop from toolbox → create new field on the currently active page
    if (active.data.current?.from === 'toolbox') {
      const type = active.data.current.type as FieldType;
      const overIndex = fields
        .filter((f) => !f.deleted && f.pageId === activePageId)
        .findIndex((f) => f.fieldId === over.id);

      if (overIndex !== -1) {
        const modifier = isDroppingBelow(active, over) ? 1 : 0;
        addField(type, overIndex + modifier);
      } else {
        addField(type);
      }
      return;
    }

    // Reorder existing canvas fields → sortable handles this
    if (
      active.data.current?.from === 'canvas' &&
      active.id !== over.id
    ) {
      reorderFields(active.id as string, over.id as string);
    }
  }

  // ─── DragOverlay preview content ───────────────────────────────────────────
  const activeDragConfig = activeDragId?.startsWith('toolbox-')
    ? FIELD_TYPE_CONFIG.find(
        (c) => `toolbox-${c.type}` === activeDragId
      )
    : null;

  // Reordering an existing canvas field → render a floating ghost of that card
  const activeDragField = !activeDragConfig
    ? fields.find((f) => f.fieldId === activeDragId)
    : null;
  const activeDragFieldConfig = activeDragField
    ? FIELD_TYPE_CONFIG.find((c) => c.type === activeDragField.type)
    : null;

  return {
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    dropAnimation,
    dragOverInfo,
    isToolboxOver,
    activeDragConfig,
    activeDragField,
    activeDragFieldConfig,
  };
}

export type BuilderDnd = ReturnType<typeof useBuilderDnd>;
