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
import { setPendingEdit } from '@/lib/pendingEdits';

interface Row {
  id: string;
  value: string;
}

function OptionRow({
  row,
  disabled,
  duplicate,
  empty,
  inputRef,
  onChange,
  onCommit,
  onEnter,
  onDelete,
}: {
  row: Row;
  disabled: boolean;
  duplicate: boolean;
  empty: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onCommit: () => void;
  onEnter: () => void;
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
            onEnter();
          }
        }}
        aria-invalid={empty || duplicate || undefined}
        title={empty ? 'Option cannot be empty' : duplicate ? 'Duplicate option' : undefined}
        className={`flex-1 min-w-0 rounded-md border-2 ${empty ? 'border-(--error-text)' : duplicate ? 'border-(--warning-text)' : 'border-(--border-default)'} px-2.5 min-h-11 bg-body-sm bg-(--surface-card) outline-none focus:border-(--border-strong)`}
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
    // An empty option is rejected by the server (400) and would make every later autosave of the form fail, so it
    // stays local, flagged inline, until it is filled in or deleted.
    if (next.some((r) => !r.value.trim())) return;
    const values = next.map((r) => r.value);
    lastCommitted.current = values;
    onUpdate(fieldId, values);
  };

  // Commit shortly after typing stops, not only on blur, so the last-typed option is never lost on a reload or a
  // hard navigation while the header says "All changes saved".
  useEffect(() => {
    const committed = lastCommitted.current;
    const unchanged = rows.length === committed.length && rows.every((r, i) => r.value === committed[i]);
    if (unchanged || rows.some((r) => !r.value.trim())) return;
    const t = setTimeout(() => commit(rows), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commit/onUpdate identity changes every render
  }, [rows]);

  // Typed but not committed: either the debounce has not fired, or a row is empty and the list is held back. Both are unsaved
  // work, so the header must not say "All changes saved" and leaving must warn (QA D3-001, D3-003).
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });
  const pendingKey = `options:${fieldId}`;
  useEffect(() => {
    const committed = lastCommitted.current;
    const differs = !(rows.length === committed.length && rows.every((r, i) => r.value === committed[i]));
    if (!differs) {
      setPendingEdit(pendingKey, null);
      return;
    }
    setPendingEdit(pendingKey, { flush: () => commit(rowsRef.current) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commit is recreated every render; the ref carries the latest rows
  }, [rows, pendingKey]);
  useEffect(() => () => setPendingEdit(pendingKey, null), [pendingKey]);

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

  const norm = (v: string) => v.trim().toLowerCase();
  const isDuplicate = (i: number) =>
    norm(rows[i].value) !== '' && rows.some((r, j) => j !== i && norm(r.value) === norm(rows[i].value));
  const hasDuplicates = rows.some((_, i) => isDuplicate(i));
  const hasEmpty = rows.some((r) => !r.value.trim());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {rows.map((row, index) => (
              <OptionRow
                key={row.id}
                row={row}
                disabled={rows.length <= 1}
                duplicate={isDuplicate(index)}
                empty={!row.value.trim()}
                inputRef={(el) => {
                  inputRefs.current[index] = el;
                }}
                onChange={(value) =>
                  setRows((prev) => prev.map((r, i) => (i === index ? { ...r, value } : r)))
                }
                onCommit={() => commit(rows)}
                onEnter={() => (index === rows.length - 1 ? handleAdd() : inputRefs.current[index + 1]?.focus())}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {hasEmpty && (
        <p role="alert" className="bg-caption font-semibold text-(--error-text)">
          An option is empty. Fill it in or delete it; empty options are not saved.
        </p>
      )}
      {hasDuplicates && (
        <p role="alert" className="bg-caption font-semibold text-(--warning-text)">
          Some options have the same label. Respondents and reports cannot tell them apart.
        </p>
      )}
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
