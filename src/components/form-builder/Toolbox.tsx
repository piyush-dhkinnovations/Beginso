'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
}

export const FIELD_TYPE_CONFIG: FieldTypeConfig[] = [
  { type: 'short_text', icon: Type, label: 'Short Text' },
  { type: 'long_text', icon: AlignLeft, label: 'Long Text' },
  { type: 'email', icon: Mail, label: 'Email' },
  { type: 'phone', icon: Phone, label: 'Phone' },
  { type: 'number', icon: Hash, label: 'Number' },
  { type: 'date', icon: Calendar, label: 'Date' },
  { type: 'dropdown', icon: ChevronDown, label: 'Dropdown' },
  { type: 'multiple_choice', icon: List, label: 'Multiple Choice' },
  { type: 'checkbox', icon: CheckSquare, label: 'Checkbox' },
  { type: 'file_upload', icon: Upload, label: 'File Upload' },
];

interface DraggableItemProps {
  config: FieldTypeConfig;
}

function DraggableToolboxItem({ config }: DraggableItemProps) {
  const { type, icon: Icon, label } = config;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: {
      source: 'toolbox',
      fieldType: type,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-neutral-200 cursor-grab active:cursor-grabbing hover:bg-neutral-50 hover:border-neutral-300 transition-all select-none shadow-sm min-h-[44px] ${
        isDragging ? 'opacity-50 border-brand-500 ring-1 ring-brand-500/20' : ''
      }`}
    >
      <Icon size={18} className="text-neutral-500 shrink-0" />
      <span className="text-body font-medium text-neutral-700">{label}</span>
    </div>
  );
}

export function Toolbox() {
  return (
    <aside className="w-[280px] flex flex-col gap-4 p-4 border-r bg-white overflow-y-auto shrink-0 shadow-sm">
      <div>
        <h3 className="text-heading-3 font-bold text-neutral-800 tracking-tight">Field Types</h3>
        <p className="text-body-sm text-neutral-400 mt-1">
          Drag and drop fields onto the canvas to customize your form.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {FIELD_TYPE_CONFIG.map((config) => (
          <DraggableToolboxItem key={config.type} config={config} />
        ))}
      </div>
    </aside>
  );
}
