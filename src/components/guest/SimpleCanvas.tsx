'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { useBuilderStore } from '@/store/builderStore';
import { brandButtonStyle, brandCardClass, brandPanelStyle, brandTypeStyle, brandWashStyle } from '@/lib/formTheme';
import { AddQuestionButton } from './QuestionTypeMenu';
import type { FormField } from '@/types/form';

// Guest "simple mode" canvas. The form is the editor: it is drawn with the form's own theme (colour, font, card, page
// background), and each question edits in place. It reads and writes the SAME builderStore fields and pages the full
// builder uses, so a guest's draft opens unchanged in the full builder after sign-up. Logic rules ride along untouched.
const CHOICE = ['dropdown', 'multiple_choice', 'checkbox'];
const ghost = 'w-full rounded-md border border-(--border-default) bg-(--bg-subtle) px-3 py-2 bg-body-sm text-(--text-muted)';

function Control({ field }: { field: FormField }) {
  const { updateFieldOptions } = useBuilderStore.getState();
  if (CHOICE.includes(field.type)) {
    const options = (field as Extract<FormField, { options: string[] }>).options ?? [];
    return (
      <ul className="flex flex-col gap-2">
        {options.map((o, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-4 shrink-0 border-2 border-(--border-strong) ${field.type === 'multiple_choice' ? 'rounded-full' : 'rounded'}`} />
            <input
              aria-label={`Option ${i + 1}`}
              value={o}
              onChange={(e) => updateFieldOptions(field.fieldId, options.map((x, j) => (j === i ? e.target.value : x)))}
              className="min-w-0 max-w-xs flex-1 border-b border-transparent bg-transparent py-1 bg-body-sm text-(--text-primary) focus:border-(--border-focus) focus:outline-none"
            />
            {options.length > 1 && (
              <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => updateFieldOptions(field.fieldId, options.filter((_, j) => j !== i))} className="flex min-h-9 min-w-9 items-center justify-center text-(--text-muted) hover:text-(--error-text)">
                <X size={14} />
              </button>
            )}
          </li>
        ))}
        <li>
          <button type="button" onClick={() => updateFieldOptions(field.fieldId, [...options, `Option ${options.length + 1}`])} className="min-h-9 bg-body-sm font-medium text-(--text-link)">
            Add option
          </button>
        </li>
      </ul>
    );
  }
  switch (field.type) {
    case 'long_text': return <div className={`${ghost} h-20`} aria-hidden="true" />;
    case 'rating': return <div className="bg-h4 tracking-widest text-(--border-strong)" aria-hidden="true">★★★★★</div>;
    case 'file_upload':
    case 'image_upload': return <div className={`${ghost} border-dashed text-center`} aria-hidden="true">Respondents upload a file here</div>;
    case 'yes_no': return <div className="flex gap-2" aria-hidden="true"><span className={ghost}>Yes</span><span className={ghost}>No</span></div>;
    case 'signature': return <div className={`${ghost} h-16`} aria-hidden="true" />;
    default: return <div className={ghost} aria-hidden="true">{field.placeholder || ' '}</div>;
  }
}

function Row({ field }: { field: FormField }) {
  const { updateField, softDeleteField } = useBuilderStore.getState();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.fieldId });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-lg border border-(--border-default) bg-(--surface-card) p-3 ${isDragging ? 'opacity-60 shadow-(--shadow-md)' : ''}`}>
      <div className="flex flex-wrap items-start gap-2">
        <button type="button" aria-label={`Move "${field.label}"`} className="mt-1 flex min-h-9 min-w-9 cursor-grab items-center justify-center text-(--text-muted) touch-none" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </button>
        <div className="flex min-w-40 flex-1 basis-48 flex-col gap-2">
          <input
            aria-label="Question"
            value={field.label}
            onChange={(e) => updateField(field.fieldId, { label: e.target.value })}
            className="w-full border-b border-transparent bg-transparent py-1 bg-body font-semibold text-(--text-primary) focus:border-(--border-focus) focus:outline-none"
          />
          <Control field={field} />
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          <div className="flex items-center gap-2">
            <label htmlFor={`req-${field.fieldId}`} className="bg-body-sm text-(--text-secondary)">Required</label>
            <Switch id={`req-${field.fieldId}`} checked={field.required} onChange={(v) => updateField(field.fieldId, { required: v })} />
          </div>
          <button type="button" aria-label={`Delete "${field.label}"`} onClick={() => softDeleteField(field.fieldId)} className="flex min-h-9 min-w-9 items-center justify-center text-(--text-muted) hover:text-(--error-text)">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}

export function SimpleCanvas({ setTitle }: { setTitle: (t: string) => void }) {
  const fields = useBuilderStore((s) => s.fields);
  const pages = useBuilderStore((s) => s.pages);
  const formTitle = useBuilderStore((s) => s.formTitle);
  const branding = useBuilderStore((s) => s.branding);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const { setPageTitle, setPageDescription, setActivePageId, addField, reorderFields, addPage, deletePage } = useBuilderStore.getState();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) reorderFields(String(e.active.id), String(e.over.id));
  };
  const hasExtras = fields.some((f) => !f.deleted && f.logicRules?.length);

  return (
    <div className="min-h-full">
      <div className="min-h-full p-4 sm:p-10" style={{ ...brandTypeStyle(branding), ...brandWashStyle(branding) }}>
      <div className={`mx-auto max-w-2xl ${brandCardClass(branding)}`}>
        <div className="flex flex-col gap-2 px-5 py-6 text-white sm:px-8" style={brandPanelStyle(branding)}>
          {branding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- object URL of a local image, not a static asset
            <img src={branding.logoUrl} alt="Logo" className="mb-1 size-12 rounded-md bg-white object-contain" />
          )}
          <input
            aria-label="Form title"
            value={first?.title ?? formTitle}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled form"
            className="w-full bg-transparent bg-h3 font-bold text-white placeholder:text-white/70 focus:outline-none"
          />
          <input
            aria-label="Form description"
            value={first?.description ?? ''}
            onChange={(e) => first && setPageDescription(first.id, e.target.value)}
            placeholder="Add a short description"
            className="w-full bg-transparent bg-body text-white placeholder:text-white/70 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-6 bg-(--surface-card) p-4 sm:p-8">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            {sorted.map((page, i) => {
              const rows = fields.filter((f) => !f.deleted && f.pageId === page.id).sort((a, b) => a.order - b.order);
              const active = (activePageId ?? sorted[0]?.id) === page.id;
              return (
                <section
                  key={page.id}
                  aria-label={page.title || `Section ${i + 1}`}
                  onFocusCapture={() => setActivePageId(page.id)}
                  onPointerDown={() => setActivePageId(page.id)}
                  className={`flex flex-col gap-3 rounded-lg ${sorted.length > 1 ? 'p-2 -m-2' : ''} ${active && sorted.length > 1 ? 'outline-2 outline-(--border-focus)' : ''}`}
                >
                  {i > 0 && (
                    <div className="flex items-center gap-2 border-t border-(--border-default) pt-4">
                      <input aria-label="Section title" value={page.title ?? ''} onChange={(e) => setPageTitle(page.id, e.target.value)} placeholder="Section title" className="min-w-0 flex-1 bg-transparent bg-h5 font-bold text-(--text-primary) focus:outline-none" />
                      <button type="button" aria-label={`Delete section ${page.title || i + 1}`} onClick={() => deletePage(page.id)} className="flex min-h-9 min-w-9 items-center justify-center text-(--text-muted) hover:text-(--error-text)">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                  <SortableContext items={rows.map((r) => r.fieldId)} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-3">{rows.map((f) => <Row key={f.fieldId} field={f} />)}</ul>
                  </SortableContext>
                  {rows.length === 0 && (
                    <p className="rounded-lg border border-dashed border-(--border-strong) p-4 text-center bg-body-sm text-(--text-muted)">
                      No questions in this section yet. <span className="hidden lg:inline">Pick a field on the left.</span><span className="lg:hidden">Use Add question below.</span>
                    </p>
                  )}
                  <div className="lg:hidden"><AddQuestionButton onAdd={(t) => { setActivePageId(page.id); addField(t); }} /></div>
                </section>
              );
            })}
          </DndContext>
          <button type="button" onClick={() => { addPage(); }} className="flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-dashed border-(--border-strong) px-4 bg-body-sm font-medium text-(--text-link) hover:bg-(--accent-soft)">
            <Plus size={16} aria-hidden="true" />
            Add section
          </button>
          <span className="self-start rounded-md px-6 py-2.5 bg-body font-semibold" style={brandButtonStyle(branding)} aria-hidden="true">Submit</span>
        </div>
      </div>
      {hasExtras && <p className="mx-auto mt-4 max-w-2xl bg-body-sm text-(--text-secondary)">More options (conditional logic, form limits) are available after you sign up.</p>}
      </div>
    </div>
  );
}

/** Add a question to the section being edited (the first section if none is). Used by the left panel. */
export function addQuestionToActive(type: FormField['type']) {
  const st = useBuilderStore.getState();
  const first = [...st.pages].sort((a, b) => a.order - b.order)[0];
  if (first && !st.pages.some((p) => p.id === st.activePageId)) st.setActivePageId(first.id);
  useBuilderStore.getState().addField(type);
}
