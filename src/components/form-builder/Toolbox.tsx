'use client';

import { useDraggable } from '@dnd-kit/core';
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  ChevronDown,
  List,
  CheckSquare,
  Upload,
  LucideIcon,
} from 'lucide-react';
import type { FieldType } from '@/types/form';

export interface FieldTypeConfig {
  type: FieldType;
  icon: LucideIcon;
  label: string;
  color: string;       // icon chip background
  iconColor: string;   // icon color
}

export const FIELD_TYPE_CONFIG: FieldTypeConfig[] = [
  { type: 'short_text', icon: Type, label: 'Short Text', color: 'bg-blue-50', iconColor: 'text-blue-500' },
  { type: 'long_text', icon: AlignLeft, label: 'Long Text', color: 'bg-violet-50', iconColor: 'text-violet-500' },
  { type: 'email', icon: Mail, label: 'Email', color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  { type: 'phone', icon: Phone, label: 'Phone', color: 'bg-sky-50', iconColor: 'text-sky-500' },
  { type: 'number', icon: Hash, label: 'Number', color: 'bg-amber-50', iconColor: 'text-amber-500' },
  { type: 'date', icon: Calendar, label: 'Date', color: 'bg-rose-50', iconColor: 'text-rose-500' },
  { type: 'dropdown', icon: ChevronDown, label: 'Dropdown', color: 'bg-orange-50', iconColor: 'text-orange-500' },
  { type: 'multiple_choice', icon: List, label: 'Multiple Choice', color: 'bg-teal-50', iconColor: 'text-teal-500' },
  { type: 'checkbox', icon: CheckSquare, label: 'Checkbox', color: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  { type: 'file_upload', icon: Upload, label: 'File Upload', color: 'bg-pink-50', iconColor: 'text-pink-500' },
];

interface DraggableItemProps {
  config: FieldTypeConfig;
  onAdd?: (type: FieldType) => void;
}

function DraggableToolboxItem({ config, onAdd }: DraggableItemProps) {
  const { type, icon: Icon, label, color, iconColor } = config;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { from: 'toolbox', type },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ touchAction: 'none', opacity: isDragging ? 0.45 : 1 }}
      {...listeners}
      {...attributes}
      onClick={() => onAdd?.(type)}
      title={label}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing
        select-none transition-all duration-150
        ${isDragging
          ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-400/20 shadow-md'
          : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm'
        }
      `}
    >
      {/* Colored icon chip */}
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={14} className={iconColor} />
      </div>
      {/* Label */}
      <span className="text-[13px] font-medium text-neutral-700 leading-none whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export interface ToolboxProps {
  onAdd?: (type: FieldType) => void;
}

export function Toolbox({ onAdd }: ToolboxProps) {
  return (
    <aside className="w-[220px] flex flex-col gap-3 p-3 border-r border-neutral-200 bg-white overflow-y-auto shrink-0">
      {/* Header */}
      <div className="px-1 pt-1">
        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
          Field Types
        </h3>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1.5">
        {FIELD_TYPE_CONFIG.map((config) => (
          <DraggableToolboxItem key={config.type} config={config} onAdd={onAdd} />
        ))}
      </div>

      {/* Footer hint */}
      <p className="text-[10px] text-neutral-400 text-center px-2 pb-1 leading-relaxed">
        Click or drag to add fields
      </p>
    </aside>
  );
}
