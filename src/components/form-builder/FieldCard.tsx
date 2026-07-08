'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';
import type { FormField } from '@/types/form';
import { FIELD_TYPE_CONFIG } from './Toolbox';

interface FieldCardProps {
  field: FormField;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function FieldCard({ field, isActive, onSelect, onDelete }: FieldCardProps) {
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
    transition: isDragging ? 'none' : transition,
    touchAction: 'none',
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isActive && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      onDelete();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`group flex items-center justify-between p-4 bg-white border rounded-lg transition-colors focus:outline-none focus:border-brand-500 shadow-card min-h-[56px] select-none ${
        isActive
          ? 'border-brand-700 ring-2 ring-brand-700/20'
          : 'border-neutral-200 hover:border-neutral-300'
      } ${isDragging ? 'opacity-50 border-brand-500 ring-1 ring-brand-500/10' : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Grip Handle */}
        <div
          {...listeners}
          {...attributes}
          className="text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-colors shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()} // Prevent select on grip drag-start
        >
          <GripVertical size={16} />
        </div>

        {/* Icon & Label */}
        {Icon && (
          <Icon size={16} className="text-neutral-500 shrink-0" />
        )}
        <span className="text-body font-medium text-neutral-800 truncate pr-4">
          {field.label}
          {field.required && (
            <span className="text-rose-500 ml-1" title="Required">*</span>
          )}
        </span>
      </div>

      {/* Action Buttons */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
        title="Delete Field"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
