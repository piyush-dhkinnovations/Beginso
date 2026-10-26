'use client';

import { useState } from 'react';
import { ChevronDown, GripVertical, Plus, Search, X } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ResponseColumnCell, columnLabel } from '../ResponseColumnCell';
import { RespondentFromProvider } from '../RespondentFromContext';
import { textFields } from '@/lib/answerText';
import { questionColumn, TABLE_BUILTIN_COLUMNS, type TableColumnKey } from '@/types/responseSetup';
import { bx } from '@/lib/utils';
import { moveColumn, type Draft } from './draft';
import { MAX_TABLE_COLUMNS } from './limits';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

/** How many columns are offered as buttons; the rest are behind "More" (a form can have dozens of questions). */
const SUGGESTED = 4;

interface ColumnsTabProps {
  draft: Draft;
  onChange: (next: Draft) => void;
  fields: readonly FormField[] | undefined;
  previewRows: IResponse[];
  previewIsSample: boolean;
}

/** One column in the list: a handle to drag it by (or to pick up with the keyboard: Space, then the arrow keys), its name, and a remove button. */
function ColumnRow({ id, label, isQuestion, canRemove, onRemove }: { id: string; label: string; isQuestion: boolean; canRemove: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      // Locked to the vertical axis: a diagonal drag would push the row sideways out of the panel.
      style={{ transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined, transition: isDragging ? 'none' : transition }}
      className={bx(
        'flex items-center gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) py-1.5 pl-1.5 pr-1.5',
        isDragging && 'relative z-1 opacity-70 shadow-(--shadow-md)',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${label}`}
        title="Drag to move"
        className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--border-focus) active:cursor-grabbing"
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 truncate bg-body-sm font-medium text-(--text-primary)">{label}</span>
      {isQuestion && <span className="bg-caption text-(--text-muted)">Question</span>}
      <Button variant="ghost" size="small" aria-label={`Remove ${label}`} disabled={!canRemove} onClick={onRemove}>
        <X size={14} aria-hidden="true" />
      </Button>
    </li>
  );
}

/** Which columns the table shows, in which order, with a preview built from the same cells as the table itself. */
export function ColumnsTab({ draft, onChange, fields, previewRows, previewIsSample }: ColumnsTabProps) {
  const { tableColumns, wrap, rowHeight, respondentFrom } = draft.values;
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const setColumns = (next: TableColumnKey[]) => onChange({ ...draft, values: { ...draft.values, tableColumns: next } });

  // Only columns that still mean something: a question that was deleted has no label and is not offered.
  const shown = tableColumns.map((key) => ({ key, label: columnLabel(key, fields) })).filter((c): c is { key: string; label: string } => c.label !== undefined);
  const unused = [
    ...TABLE_BUILTIN_COLUMNS.filter((k) => !tableColumns.includes(k)),
    ...textFields(fields).map((f) => questionColumn(f.fieldId)).filter((k) => !tableColumns.includes(k)),
  ];
  const full = tableColumns.length >= MAX_TABLE_COLUMNS;
  const suggested = unused.slice(0, SUGGESTED);
  const more = unused.slice(SUGGESTED);
  const add = (key: TableColumnKey) => setColumns([...tableColumns, key]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) setColumns(moveColumn(tableColumns, String(active.id), String(over.id)));
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="cols-shown" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="cols-shown" className="bg-body font-semibold text-(--text-primary)">Shown in the table, left to right</h3>
          <p className="bg-body-sm text-(--text-muted)">Drag a column by its handle to move it. The first column stays in view when the table scrolls sideways, and it carries the person&apos;s picture.</p>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shown.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {shown.map((c) => (
                <ColumnRow
                  key={c.key}
                  id={c.key}
                  label={c.label}
                  isQuestion={c.key.startsWith('q:')}
                  canRemove={shown.length > 1}
                  onRemove={() => setColumns(tableColumns.filter((k) => k !== c.key))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </section>

      <section aria-labelledby="cols-add" className="flex flex-col gap-3">
        <h3 id="cols-add" className="bg-body font-semibold text-(--text-primary)">Add a column</h3>
        {unused.length === 0 ? (
          <p className="bg-body-sm text-(--text-muted)">Every column is already in the table.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggested.map((key) => (
              <Button key={key} variant="secondary" size="small" disabled={full} onClick={() => add(key)}>
                <Plus size={14} className="mr-1" aria-hidden="true" />
                {columnLabel(key, fields)}
              </Button>
            ))}
            {more.length > 0 && !full && (
              <Button variant="ghost" size="small" aria-expanded={moreOpen} aria-controls="more-columns" aria-label={`More columns, ${more.length}`} onClick={() => setMoreOpen((o) => !o)}>
                More ({more.length})
                <ChevronDown size={14} className={bx('ml-1 transition-transform', moreOpen && 'rotate-180')} aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
        {moreOpen && more.length > 0 && !full && (
          <div id="more-columns" className="flex flex-col gap-2 rounded-xl border border-(--border-default) p-3">
            <Input id="more-columns-search" aria-label="Search the other columns" placeholder="Search" leftIcon={<Search size={14} aria-hidden="true" />} value={query} onChange={(e) => setQuery(e.target.value)} />
            <ul className="flex max-h-56 flex-col overflow-y-auto">
              {more
                .map((key) => ({ key, label: columnLabel(key, fields) ?? key }))
                .filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()))
                .map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => add(c.key)}
                      title={c.label}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left bg-body-sm text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
                    >
                      <Plus size={14} className="shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    </button>
                  </li>
                ))}
            </ul>
            {more.every((k) => !(columnLabel(k, fields) ?? k).toLowerCase().includes(query.trim().toLowerCase())) && <p className="bg-body-sm text-(--text-muted)">No column matches &ldquo;{query}&rdquo;.</p>}
          </div>
        )}
        {full && <p className="bg-caption text-(--text-muted)">The table can show up to {MAX_TABLE_COLUMNS} columns.</p>}
      </section>

      <section aria-labelledby="cols-preview" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="cols-preview" className="bg-body font-semibold text-(--text-primary)">Preview</h3>
          <p className="bg-body-sm text-(--text-muted)">
            {previewIsSample ? 'This form has no responses yet, so these are examples. ' : 'Your latest responses. '}
            Scroll sideways to see every column. Nothing changes on the page until you save.
          </p>
        </div>
        <RespondentFromProvider value={respondentFrom}>
        <div className="max-w-full overflow-x-auto rounded-xl border border-(--border-default)" role="region" aria-label="Table preview" tabIndex={0}>
          <table className={bx('w-max min-w-full border-collapse bg-body-sm', rowHeight === 'compact' ? '[&_td]:py-1.5' : '[&_td]:py-3')}>
            <thead>
              <tr className="bg-(--bg-subtle)">
                {shown.map((c, i) => (
                  <th key={c.key} scope="col" className={bx('whitespace-nowrap px-4 py-2.5 text-left bg-caption font-medium uppercase tracking-wide text-(--text-muted)', i === 0 && 'sticky left-0 z-1 bg-(--bg-subtle)')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r) => (
                <tr key={r._id} className="border-t border-(--border-subtle)">
                  {shown.map((c, i) => (
                    <td key={c.key} className={bx('px-4 text-(--text-secondary)', i === 0 && 'sticky left-0 z-1 bg-(--surface-card)')}>
                      <ResponseColumnCell columnKey={c.key} response={r} fields={fields} respondentFrom={respondentFrom} wrap={wrap} lead={i === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </RespondentFromProvider>
      </section>
    </div>
  );
}
