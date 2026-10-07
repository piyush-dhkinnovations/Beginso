'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Copy, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { FIELD_TYPE_CONFIG } from './Toolbox';
import { FieldInlineEditor } from './FieldInlineEditor';
import { FieldLogicEditor } from './FieldLogicEditor';
import { FieldPreview } from './FieldPreview';

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
  /** Sprint 13 (CF2.12) — Reorder mode on touch widths: handle + Up/Down on every row, no inline editor. */
  reorderMode?: boolean;
}

// ─── Dashed drop-zone card ────────────────────────────────────────────────────
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
  reorderMode = false,
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
  });

  const config = FIELD_TYPE_CONFIG.find((cfg) => cfg.type === field.type);
  const optionCount = 'options' in field && Array.isArray(field.options) ? field.options.length : 0;
  const Icon = config ? config.icon : null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Keep dnd-kit's smooth transition for reordering; disable it while actively dragging
    transition: isDragging ? 'none' : transition,
    // No touch-action here: the card must not swallow vertical scrolling on a phone. Only the grip
    // handle (below) opts out, so dragging starts from the handle and everything else scrolls.
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isActive) return;

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

  // Collapse the inline editor while the card is being dragged so the sortable
  // placeholder doesn't leave an oversized gap in the list mid-drag.
  const showInlinePanel = isActive && !isDragging && !reorderMode;

  return (
    // Outer wrapper keeps layout space and holds the drop-zone indicators.
    // It must NOT be the node that gets the dnd transform — only the inner card does.
    <div className="flex flex-col gap-1.5" data-field-id={field.fieldId}>
      {insertIndicator === 'above' && <DropZoneCard />}

      <div
        ref={setNodeRef}
        style={style}
        onClick={(e) => e.stopPropagation()}
        className={`relative group bg-(--surface-card) border rounded-lg transition-all duration-150 shadow-(--shadow-sm) select-none ${
          isDragging
            ? 'opacity-0'
            : isActive
            ? 'border-(--action-primary-hover) ring-2 ring-(--action-primary-hover)/20'
            : 'border-(--border-default) hover:border-(--border-strong)'
        }`}
      >
        {/* Header row — click to select, keyboard delete/reorder. This is the whole
            "collapsed" card and must stay unchanged: grip handle at the very start,
            hover-reveal Duplicate/Delete on the right. */}
        <div
          onClick={onSelect}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Select ${field.label} field`}
          aria-pressed={isActive}
          className={`flex items-start gap-3 p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-inset ${
            showInlinePanel ? 'rounded-t-lg' : 'rounded-lg'
          }`}
        >
          <div
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'none' }}
            aria-label={`Reorder ${field.label}. Press Space, then arrow keys, then Space.`}
            // Below 1024px fields are only draggable inside Reorder mode (requirements.md 4.3).
            className={`text-(--text-disabled) hover:text-(--text-secondary) cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-colors shrink-0 min-w-11 min-h-11 items-center justify-center ${
              reorderMode ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <GripVertical size={16} />
          </div>

          {Icon && (
            <Icon size={16} className="text-(--text-muted) shrink-0 mt-2" />
          )}

          {/* Label row + live preview — both live in the same flex-1 column so the
              preview aligns under the label, not under the grip/icon. */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 min-h-6">
              <span className="bg-body font-medium text-(--text-primary) truncate">
                {field.label}
              </span>

              {reorderMode ? (
                <div className="flex items-center gap-1 shrink-0">
                  {/* aria-disabled (not disabled) at the ends so focus is not lost when a row reaches the top/bottom. */}
                  <button
                    type="button"
                    data-move="up"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveUp?.();
                    }}
                    aria-disabled={!onMoveUp}
                    aria-label={`Move ${field.label} up`}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border border-(--border-default) text-(--text-secondary) ${
                      onMoveUp ? 'hover:bg-(--surface-hover)' : 'opacity-40'
                    }`}
                  >
                    <ChevronUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-move="down"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveDown?.();
                    }}
                    aria-disabled={!onMoveDown}
                    aria-label={`Move ${field.label} down`}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border border-(--border-default) text-(--text-secondary) ${
                      onMoveDown ? 'hover:bg-(--surface-hover)' : 'opacity-40'
                    }`}
                  >
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : (
              // Hover-reveal on desktop; always visible below 1024px where there is no hover.
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-lg:opacity-100 transition-all shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-(--text-disabled) transition-all hover:bg-(--accent-soft) hover:text-(--accent-soft-text)"
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
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-(--text-disabled) transition-all hover:bg-(--error-surface) hover:text-(--error-text)"
                  title="Delete Field"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              )}
            </div>

            <p className="bg-caption text-(--text-muted) -mt-1">
              {config?.label ?? field.type}
              {optionCount > 0 && ` · ${optionCount} option${optionCount === 1 ? '' : 's'}`}
              {field.required && <span className="font-medium text-(--error-text)"> · Required</span>}
            </p>

            {/* Live, non-interactive preview of what respondents will see */}
            <FieldPreview field={field} />
          </div>
        </div>

        {/* Inline properties + logic — only rendered while this field is selected */}
        {showInlinePanel && (
          <div className="border-t border-(--border-default) px-4 pb-4 pt-4 flex flex-col gap-4">
            <FieldInlineEditor field={field} onUpdate={onUpdate} onUpdateOptions={onUpdateOptions} />
            <div className="h-px bg-(--border-default)" />
            <FieldLogicEditor
              field={field}
              allFields={allFields}
              onAddRule={onAddLogicRule}
              onUpdateRule={onUpdateLogicRule}
              onDeleteRule={onDeleteLogicRule}
            />
          </div>
        )}
      </div>

      {insertIndicator === 'below' && <DropZoneCard />}
    </div>
  );
}
