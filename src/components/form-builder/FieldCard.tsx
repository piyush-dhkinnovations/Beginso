'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Copy, GripVertical } from 'lucide-react';
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
}

// ─── Dashed drop-zone card ────────────────────────────────────────────────────
// Matches the reference: rounded card with a dashed blue border, animated in.
function DropZoneCard() {
  return (
    <div
      className="animate-drop-indicator origin-top w-full rounded-lg border-2 border-dashed border-brand-500 bg-brand-50/60"
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
  });

  // Look up icon from toolbox configuration
  const config = FIELD_TYPE_CONFIG.find((cfg) => cfg.type === field.type);
  const Icon = config ? config.icon : null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Keep dnd-kit's smooth transition for reordering; disable it while actively dragging
    transition: isDragging ? 'none' : transition,
    touchAction: 'none',
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
  const showInlinePanel = isActive && !isDragging;

  return (
    // Outer wrapper keeps layout space and holds the drop-zone indicators.
    // It must NOT be the node that gets the dnd transform — only the inner card does.
    <div className="flex flex-col gap-1.5">
      {/* Drop zone ABOVE this card */}
      {insertIndicator === 'above' && <DropZoneCard />}

      <div
        ref={setNodeRef}
        style={style}
        onClick={(e) => e.stopPropagation()}
        className={`relative group bg-white border rounded-lg transition-all duration-150 shadow-card select-none ${
          isDragging
            ? 'opacity-0'
            : isActive
            ? 'border-brand-700 ring-2 ring-brand-700/20'
            : 'border-neutral-200 hover:border-neutral-300'
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
          className={`flex items-start gap-3 p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset ${
            showInlinePanel ? 'rounded-t-lg' : 'rounded-lg'
          }`}
        >
          {/* Grip Handle — drag listeners only, no click propagation */}
          <div
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
            className="text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-colors shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <GripVertical size={16} />
          </div>

          {/* Icon */}
          {Icon && (
            <Icon size={16} className="text-neutral-500 shrink-0 mt-2" />
          )}

          {/* Label row + live preview — both live in the same flex-1 column so the
              preview aligns under the label, not under the grip/icon. */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 min-h-[24px]">
              <span className="text-body font-medium text-neutral-800 truncate">
                {field.label}
                {field.required && (
                  <span className="text-rose-500 ml-1" title="Required">*</span>
                )}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="p-2 text-neutral-400 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                  className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Delete Field"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Live, non-interactive preview of what respondents will see */}
            <FieldPreview field={field} />
          </div>
        </div>

        {/* Inline properties + logic — only rendered while this field is selected */}
        {showInlinePanel && (
          <div className="border-t border-neutral-200 px-4 pb-4 pt-4 flex flex-col gap-4">
            <FieldInlineEditor field={field} onUpdate={onUpdate} onUpdateOptions={onUpdateOptions} />
            <div className="h-px bg-neutral-200" />
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

      {/* Drop zone BELOW this card */}
      {insertIndicator === 'below' && <DropZoneCard />}
    </div>
  );
}
