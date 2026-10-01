'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';

interface Row {
  id: string;
  value: string;
}

function OptionRow({
  row,
  disabled,
  inputRef,
  onChange,
  onCommit,
  onDelete,
}: {
  row: Row;
  disabled: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style: React.CSSProperties = {
    // Lock the drag transform to the y-axis — this is a vertical list, and an unconstrained
    // diagonal drag was pushing rows sideways far enough to trigger a horizontal scrollbar.
    transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined,
    transition: isDragging ? 'none' : transition,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 ${isDragging ? 'opacity-50' : ''}`}>
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="text-(--text-disabled) hover:text-(--text-secondary) cursor-grab active:cursor-grabbing shrink-0 min-w-11 min-h-11 flex items-center justify-center"
        aria-label="Reorder option"
      >
        <GripVertical size={14} />
      </button>
      <input
        ref={inputRef}
        value={row.value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex-1 min-w-0 rounded-md border-2 border-(--border-default) px-2.5 min-h-11 bg-body-sm bg-(--surface-card) outline-none focus:border-(--border-strong)"
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="text-(--text-disabled) hover:text-(--error-text) disabled:opacity-30 disabled:pointer-events-none shrink-0 min-w-11 min-h-11 flex items-center justify-center"
        aria-label="Delete option"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export interface OptionsEditorProps {
  fieldId: string;
  options: string[];
  onUpdate: (fieldId: string, options: string[]) => void;
}

export function OptionsEditor({ fieldId, options, onUpdate }: OptionsEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => options.map((value) => ({ id: crypto.randomUUID(), value })));
  // Tracks the exact array reference we last sent via onUpdate — the store hands that same
  // reference straight back as `options`, so seeing it again means "we caused this", not an
  // external change (undo, field switch), and rows/ids shouldn't be regenerated.
  const lastCommitted = useRef(options);
  const focusIndexRef = useRef<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (options === lastCommitted.current) return;
    lastCommitted.current = options;
    setRows(options.map((value) => ({ id: crypto.randomUUID(), value })));
  }, [options]);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      inputRefs.current[focusIndexRef.current]?.focus();
      focusIndexRef.current = null;
    }
  }, [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commit = (next: Row[]) => {
    setRows(next);
    const values = next.map((r) => r.value);
    lastCommitted.current = values;
    onUpdate(fieldId, values);
  };

  const handleAdd = () => {
    const next = [...rows, { id: crypto.randomUUID(), value: `Option ${rows.length + 1}` }];
    focusIndexRef.current = next.length - 1;
    commit(next);
  };

  const handleDelete = (index: number) => {
    if (rows.length <= 1) return;
    commit(rows.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    commit(arrayMove(rows, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[240px] overflow-y-auto overflow-x-hidden flex flex-col gap-2 pr-0.5">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {rows.map((row, index) => (
              <OptionRow
                key={row.id}
                row={row}
                disabled={rows.length <= 1}
                inputRef={(el) => {
                  inputRefs.current[index] = el;
                }}
                onChange={(value) =>
                  setRows((prev) => prev.map((r, i) => (i === index ? { ...r, value } : r)))
                }
                onCommit={() => commit(rows)}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex min-h-11 items-center gap-1.5 self-start px-2 bg-body-sm font-medium text-(--accent-soft-text) hover:text-(--accent-soft-text)"
      >
        <Plus size={14} />
        Add option
      </button>
    </div>
  );
}
