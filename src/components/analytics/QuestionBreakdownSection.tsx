'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Menu, menuChoices } from '@/components/ui/Menu';
import { TONES, TONE_COLOR } from '@/components/dashboard-grid/types';
import type { KpiTone } from '@/components/ui/KpiCard';
import { useQuestionLayout } from '@/hooks/useQuestionLayout';
import { CARD_GRID, CARD_SPAN, SortableCard } from './SortableCard';
import { QuestionBreakdownChart } from './QuestionBreakdownChart';
import { QuestionSummaryCard, hasSummary } from './QuestionSummaryCard';
import type { Form, FormField } from '@/types/form';
import type { QuestionBreakdown } from '@/types/analytics';
import type { ChartSize } from '@/types/charts';

const CHOICE_FIELD_TYPES = new Set<FormField['type']>(['dropdown', 'multiple_choice', 'checkbox']);

function isChoiceField(field: FormField): boolean {
  return !field.deleted && CHOICE_FIELD_TYPES.has(field.type);
}

// Questions with no options to count: they get an average / split instead (QA A7-008).
const SUMMARY_FIELD_TYPES = new Set<FormField['type']>(['rating', 'number', 'currency', 'yes_no']);

function isSummaryField(field: FormField): boolean {
  return !field.deleted && SUMMARY_FIELD_TYPES.has(field.type);
}

const SIZES: { value: ChartSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

/** The three-dot menu of a question card: its size and, when it has bars, their colour. */
function QuestionCardMenu({ label, size, tone, onSize, onTone }: { label: string; size: ChartSize; tone: KpiTone; onSize: (size: ChartSize) => void; onTone?: (tone: KpiTone) => void }) {
  const items = [
    ...menuChoices('Size', SIZES, size, onSize),
    ...(onTone ? menuChoices('Colour', TONES.map((t) => ({ ...t, swatch: TONE_COLOR[t.value] })), tone, onTone) : []),
  ];
  return <Menu align="end" triggerLabel={`Options for ${label}`} items={items} />;
}

interface QuestionBreakdownSectionProps {
  form?: Form;
  breakdown?: QuestionBreakdown[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** fieldIds that already have a saved chart in the Charts section. */
  chartedFieldIds?: ReadonlySet<string>;
}

export function QuestionBreakdownSection({ form, breakdown, isLoading, isError = false, onRetry, chartedFieldIds }: QuestionBreakdownSectionProps) {
  const choiceFields = (form?.fields ?? []).filter(isChoiceField);
  const summaryFields = (form?.fields ?? []).filter(isSummaryField);
  const [layout, saveLayout] = useQuestionLayout(form?._id ?? '');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // The form's own field label wins over whatever label the analytics payload carries (it can be the bare type name,
  // e.g. two cards both titled "Multiple Choice"); if two questions still share a label, number them.
  const labelOf = (field: FormField, i: number) => {
    const base = field.label?.trim() || 'Untitled question';
    return choiceFields.filter((f) => (f.label?.trim() || 'Untitled question') === base).length > 1 ? `${base} (question ${i + 1})` : base;
  };

  // No empty section header when there's nothing to show it for (Requirement 6.5).
  if (choiceFields.length === 0 && summaryFields.length === 0) return null;

  // Questions the user already charted below are not repeated here; unanswered ones collapse into one list.
  const rows = choiceFields.map((field, i) => ({
    field,
    i,
    question: {
      ...(breakdown?.find((b) => b.fieldId === field.fieldId) ?? { fieldId: field.fieldId, options: [] }),
      label: labelOf(field, i),
    },
  }));
  const charted = rows.filter((r) => chartedFieldIds?.has(r.field.fieldId));
  const rest = rows.filter((r) => !chartedFieldIds?.has(r.field.fieldId));
  const isEmpty = (r: (typeof rows)[number]) => r.question.options.every((o) => o.count === 0);
  const summaryRows = summaryFields
    .filter((field) => !chartedFieldIds?.has(field.fieldId))
    .map((field) => ({
      field,
      question: { ...(breakdown?.find((b) => b.fieldId === field.fieldId) ?? { fieldId: field.fieldId, options: [] }), label: field.label?.trim() || 'Untitled question' },
    }));
  const summaryShown = isLoading ? [] : summaryRows.filter((r) => hasSummary(r.question));
  const empty = isLoading ? [] : [...rest.filter(isEmpty), ...summaryRows.filter((r) => !hasSummary(r.question))];
  const shown = isLoading ? rest : rest.filter((r) => !isEmpty(r));

  // Saved places first; a question the user never moved keeps its natural place after them.
  const place = (id: string) => {
    const at = layout.order.indexOf(id);
    return at === -1 ? layout.order.length : at;
  };
  const cards = [...shown, ...(isLoading ? summaryRows : summaryShown)].sort((a, b) => place(a.field.fieldId) - place(b.field.fieldId));
  const ids = cards.map((c) => c.field.fieldId);
  const sizeOf = (id: string): ChartSize => layout.sizes[id] ?? 'medium';

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const moved = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    // Questions with no card right now (no answers in this range) keep their saved place for later.
    saveLayout({ ...layout, order: [...moved, ...layout.order.filter((id) => !moved.includes(id))] });
  }

  const nameOf = (id: string | number) => cards.find((c) => c.field.fieldId === id)?.question.label ?? 'question';
  const positionOf = (id: string | number) => `position ${ids.indexOf(String(id)) + 1} of ${ids.length}`;
  type Dragged = { active: { id: string | number }; over: { id: string | number } | null };
  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) => `Picked up ${nameOf(active.id)}, ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }: Dragged) => (over ? `${nameOf(active.id)} is over ${positionOf(over.id)}.` : undefined),
    onDragEnd: ({ active, over }: Dragged) => (over ? `${nameOf(active.id)} dropped at ${positionOf(over.id)}.` : `${nameOf(active.id)} dropped where it was.`),
    onDragCancel: ({ active }: { active: { id: string | number } }) => `${nameOf(active.id)} did not move.`,
  };

  return (
    <section aria-labelledby="question-breakdown-heading" className="flex flex-col gap-4">
      <h3 id="question-breakdown-heading" className="bg-h5 text-(--text-primary) font-bold">
        Per-Question Breakdown
      </h3>

      {isError ? (
        <Card role="alert" className="flex min-h-28 items-center justify-between gap-4">
          <div>
            <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load question breakdowns</p>
            <p className="mt-1 bg-caption text-(--text-muted)">The rest of the dashboard is still available.</p>
          </div>
          {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
        </Card>
      ) : (
        <>
          {charted.length > 0 && (
            <p className="bg-caption text-(--text-muted)">
              Shown as a chart above: {charted.map(({ field, i }) => labelOf(field, i)).join(', ')}
            </p>
          )}
          {isLoading ? (
            <div className={CARD_GRID}>
              {cards.map(({ field }) => (
                <Card key={field.fieldId} className={CARD_SPAN[sizeOf(field.fieldId)]}>
                  <div className="animate-pulse space-y-3" aria-busy="true" aria-label={`Loading ${field.label} breakdown`}>
                    <div className="h-4 bg-(--border-default) rounded w-1/2" />
                    <div className="h-24 bg-(--bg-sunken) rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements }}>
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                <div className={CARD_GRID}>
                  {cards.map(({ field, question }) => {
                    const CardBody = isSummaryField(field) ? QuestionSummaryCard : QuestionBreakdownChart;
                    const id = field.fieldId;
                    const tone = layout.colors[id] ?? 'primary';
                    return (
                      <SortableCard key={id} id={id} size={sizeOf(id)} handleLabel={`Reorder question ${question.label}`}>
                        {(handle) => (
                          <CardBody
                            question={question}
                            handle={handle}
                            // Blue is the theme's own colour: re-pointing the token at itself would blank the bars.
                            color={tone === 'primary' ? undefined : TONE_COLOR[tone]}
                            actions={
                              <QuestionCardMenu
                                label={question.label}
                                size={sizeOf(id)}
                                tone={tone}
                                onSize={(size) => saveLayout({ ...layout, sizes: { ...layout.sizes, [id]: size } })}
                                // Number questions show figures only: there is nothing to colour.
                                onTone={field.type === 'number' || field.type === 'currency' ? undefined : (next) => saveLayout({ ...layout, colors: { ...layout.colors, [id]: next } })}
                              />
                            }
                          />
                        )}
                      </SortableCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {empty.length > 0 && (
            <Card>
              <details>
                <summary className="cursor-pointer bg-body-sm font-semibold text-(--text-primary)">
                  {empty.length === 1 ? '1 question has' : `${empty.length} questions have`} no answers in this range
                </summary>
                <ul className="mt-3 list-disc pl-5 bg-body-sm text-(--text-muted)">
                  {empty.map(({ field, question }) => (
                    <li key={field.fieldId}>{question.label}</li>
                  ))}
                </ul>
              </details>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
