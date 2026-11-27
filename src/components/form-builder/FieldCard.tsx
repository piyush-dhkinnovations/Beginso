'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Copy, GripVertical } from 'lucide-react';
import type { FieldType, FormField, LogicRule } from '@/types/form';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { FIELD_TYPE_CONFIG } from './Toolbox';
import { FieldInlineEditor } from './FieldInlineEditor';
import { FieldLogicEditor } from './FieldLogicEditor';
import { FieldPreview } from './FieldPreview';
import { FieldPageMenu, FieldTypeMenu, cardActionClass } from './FieldMoveMenus';
import { useExpand } from './useExpand';

// Types with something to limit: only these get a Validation tab.
const VALIDATED: ReadonlySet<FieldType> = new Set(['short_text', 'long_text', 'number', 'currency', 'date', 'file_upload', 'image_upload']);

type CardTab = 'content' | 'validation' | 'logic';

interface FieldCardProps {
  field: FormField;
  allFields: FormField[];
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onUpdateOptions: (fieldId: string, options: string[]) => void;
  onAddLogicRule: (fieldId: string, rule: LogicRule) => void;
  onUpdateLogicRule: (oldFieldId: string, oldRuleIndex: number, newFieldId: string, rule: LogicRule) => void;
  onDeleteLogicRule: (fieldId: string, ruleIndex: number) => void;
  /** Undefined when there's no adjacent field to swap with (top/bottom of the list) */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Shows a dashed drop-zone card above/below this card while a toolbox field is dragged over it */
  insertIndicator?: 'above' | 'below' | null;
}

// Dashed drop-zone card
// Matches the reference: rounded card with a dashed blue border, animated in.
function DropZoneCard() {
  return (
    <div
      className="animate-drop-indicator origin-top w-full rounded-lg border-2 border-dashed border-(--border-focus) bg-(--accent-soft)/60"
      style={{ height: '52px' }}
      aria-hidden="true"
    />
  );
}

export function FieldCard({
  field,
  allFields,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdate,
  onUpdateOptions,
  onAddLogicRule,
  onUpdateLogicRule,
  onDeleteLogicRule,
  onMoveUp,
  onMoveDown,
  insertIndicator = null,
}: FieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.fieldId,
    data: { from: 'canvas' },
    // How the other cards slide out of the way: a touch slower than the library's default, easing to a stop.
    transition: { duration: 260, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  });

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // A card opens and folds with a short movement; once open (a new field, or a click) it is brought into view, and
  // 'nearest' moves the page only when needed.
  // While it is dragged a card is folded away; dropped, an open one unfolds again.
  const { ref: settingsRef, rendered: settingsRendered } = useExpand(isActive && !isDragging, () =>
    wrapperRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  );

  const [tab, setTab] = React.useState<CardTab>('content');

  const config = FIELD_TYPE_CONFIG.find((cfg) => cfg.type === field.type);
  const typeName = config?.label ?? field.type;
  const Icon = config ? config.icon : null;
  // Rules that show or hide THIS question live on the question that triggers them.
  const conditions = allFields.reduce((n, f) => n + (f.logicRules?.filter((r) => r.targetFieldId === field.fieldId).length ?? 0), 0);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Keep dnd-kit's smooth transition for reordering; disable it while actively dragging
    transition: isDragging ? 'none' : transition,
    // No touch-action here: the card must not swallow vertical scrolling on a phone. Only the grip
    // handle (below) opts out, so dragging starts from the handle and everything else scrolls.
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isActive) return;
    // Keys pressed on one of the card's buttons or in one of its menus are theirs, not the card's.
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button, [role="menu"]')) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete();
    } else if (e.altKey && e.key === 'ArrowUp' && onMoveUp) {
      e.preventDefault();
      onMoveUp();
    } else if (e.altKey && e.key === 'ArrowDown' && onMoveDown) {
      e.preventDefault();
      onMoveDown();
    }
  };

  // The settings stay while they fold away after a close, and go at once when the card is picked up.
  const showSettings = settingsRendered && !isDragging;

  const hasValidation = VALIDATED.has(field.type);
  const activeTab: CardTab = tab === 'validation' && !hasValidation ? 'content' : tab;
  const tabId = (id: CardTab) => `${field.fieldId}-${id}`;
  const panelId = (id: string) => `panel-${id}`;
  const tabs = [
    { id: tabId('content'), label: 'Content' },
    ...(hasValidation ? [{ id: tabId('validation'), label: 'Validation' }] : []),
    { id: tabId('logic'), label: conditions > 0 ? `Show or hide (${conditions})` : 'Show or hide' },
  ];
  const panel = (id: CardTab) => ({
    id: panelId(tabId(id)),
    role: 'tabpanel',
    'aria-labelledby': `tab-${tabId(id)}`,
    hidden: activeTab !== id,
  });

  const duplicateAndDelete = (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className={cardActionClass}
        title="Duplicate Field"
      >
        <Copy size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={`${cardActionClass} hover:bg-(--error-surface)! hover:text-(--error-text)!`}
        title="Delete Field"
      >
        <Trash2 size={16} />
      </button>
    </>
  );

  return (
    // Outer wrapper keeps layout space and holds the drop-zone indicators.
    // It must NOT be the node that gets the dnd transform — only the inner card does.
    <div ref={wrapperRef} className="flex scroll-mt-28 flex-col gap-1.5" data-field-id={field.fieldId}>
      {insertIndicator === 'above' && <DropZoneCard />}

      <div
        ref={setNodeRef}
        style={style}
        onClick={(e) => e.stopPropagation()}
        // Never `transition-all` here: it would also animate the position the drag library sets, and the cards jump.
        className={`relative group bg-(--surface-card) border rounded-lg transition-[border-color,box-shadow] duration-200 select-none ${
          isDragging
            ? // The place the card will land: a slim empty outline, whatever size the card is.
              'h-14 overflow-hidden border-2 border-dashed border-(--border-focus) bg-(--accent-soft)/60 *:invisible'
            : isActive
            ? 'border-(--action-primary-hover) ring-2 ring-(--action-primary-hover)/20 shadow-(--shadow-sm)'
            : 'border-(--border-default) hover:border-(--border-strong) shadow-(--shadow-sm)'
        }`}
      >
        {/* Header — click to select (again to close), keyboard delete/reorder: grip, type icon, name, then what applies to
            the question and its actions. A closed card also carries the preview under the name. */}
        <div
          onClick={onSelect}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Select ${field.label} field`}
          aria-pressed={isActive}
          className={`flex items-start gap-3 px-4 py-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-inset ${
            showSettings ? 'rounded-t-lg' : 'rounded-lg'
          }`}
        >
          <div
            {...listeners}
            {...attributes}
            data-drag-handle
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'none' }}
            aria-label={`Reorder ${field.label}. Press Space, then arrow keys, then Space.`}
            className="flex text-(--text-disabled) hover:text-(--text-secondary) cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-colors shrink-0 min-w-11 min-h-11 items-center justify-center"
          >
            <GripVertical size={16} />
          </div>

          {Icon && (
            <Icon size={16} className="hidden text-(--text-muted) shrink-0 mt-3.5 sm:block" />
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {/* On phones the actions take their own line: beside them the name was cut to a few letters. */}
            <div className="flex items-center gap-2 min-h-11 max-sm:flex-wrap">
              <span className="bg-body font-medium text-(--text-primary) truncate max-sm:max-w-full">
                {field.label}
              </span>
              {/* The type is shown by its icon; the name is for screen readers. */}
              <span className="sr-only">{typeName}</span>

              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {conditions > 0 && <Badge variant="primary" pill>Conditional</Badge>}
                {!isActive && field.required && <Badge variant="error" pill>Required</Badge>}
              </span>

              {/* On desktop a closed card's actions take no room until it is hovered or reached by keyboard; an open card, and
                  any card below 1024px where there is no hover, always shows them. */}
              <div
                className={`flex shrink-0 items-center gap-1 max-sm:basis-full max-sm:justify-end ${
                  isActive
                    ? ''
                    : 'lg:w-0 lg:overflow-hidden lg:opacity-0 lg:group-hover:w-auto lg:group-hover:opacity-100 lg:focus-within:w-auto lg:focus-within:opacity-100'
                }`}
              >
                <FieldPageMenu field={field} />
                <FieldTypeMenu field={field} />
                {duplicateAndDelete}
              </div>
            </div>

            {/* Live, non-interactive preview of what respondents will see */}
            <FieldPreview field={field} />
          </div>
        </div>

        {/* Settings — only rendered while this question is selected. Every tab stays mounted, so a half-written condition
            survives a look at another tab. */}
        {showSettings && (
          <div ref={settingsRef} inert={!isActive} className="overflow-hidden">
          <div className="border-t border-(--border-default) px-4 pb-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-(--border-default)">
              <Tabs
                tabs={tabs}
                activeId={tabId(activeTab)}
                onChange={(id) => setTab(id.slice(field.fieldId.length + 1) as CardTab)}
                ariaLabel={`${typeName} settings`}
                panelId={panelId}
                className="min-w-0 border-b-0"
              />
              <label htmlFor={`${field.fieldId}-required`} className="flex min-h-11 cursor-pointer items-center gap-2 bg-body-sm font-medium text-(--text-secondary)">
                Required
                <Switch id={`${field.fieldId}-required`} checked={field.required} onChange={(required) => onUpdate(field.fieldId, { required })} />
              </label>
            </div>

            <div {...panel('content')} className="animate-fade-in">
              {/* Keyed by type as well: the inputs hold their own text, and another type has other inputs. */}
              <FieldInlineEditor key={`${field.fieldId}:${field.type}`} field={field} section="content" onUpdate={onUpdate} onUpdateOptions={onUpdateOptions} />
            </div>
            {hasValidation && (
              <div {...panel('validation')} className="animate-fade-in">
                <FieldInlineEditor key={`${field.fieldId}:${field.type}`} field={field} section="validation" onUpdate={onUpdate} onUpdateOptions={onUpdateOptions} />
              </div>
            )}
            <div {...panel('logic')} className="animate-fade-in">
              <FieldLogicEditor
                field={field}
                allFields={allFields}
                onAddRule={onAddLogicRule}
                onUpdateRule={onUpdateLogicRule}
                onDeleteRule={onDeleteLogicRule}
              />
            </div>
          </div>
          </div>
        )}
      </div>

      {insertIndicator === 'below' && <DropZoneCard />}
    </div>
  );
}
