'use client';

import { useState } from 'react';
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
  Search,
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
  onAdd?: (type: FieldType) => void;
}

function DraggableToolboxItem({ config, onAdd }: DraggableItemProps) {
  const { type, icon: Icon, label } = config;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: {
      from: 'toolbox',
      type,
    },
  });

  const style: React.CSSProperties = {
    touchAction: 'none',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAdd?.(type)}
      title={label}
      className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-3 py-2.5 rounded-md bg-(--surface-card) border border-(--border-default) cursor-grab active:cursor-grabbing hover:bg-(--surface-hover) hover:border-(--border-strong) transition-colors select-none shadow-(--shadow-sm) min-h-11 ${
        isDragging ? 'opacity-50 border-(--border-focus) ring-1 ring-(--border-focus)/20' : ''
      }`}
    >
      <Icon size={16} className="text-(--text-muted) shrink-0" />
      <span className="hidden lg:inline bg-body font-medium text-(--text-secondary)">{label}</span>
    </div>
  );
}

export interface ToolboxProps {
  onAdd?: (type: FieldType) => void;
}

export function Toolbox({ onAdd }: ToolboxProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const fields = q ? FIELD_TYPE_CONFIG.filter((c) => c.label.toLowerCase().includes(q)) : FIELD_TYPE_CONFIG;
  return (
    // Sprint 13 (CF2.12): the rail is full width from 1024px and icon-only on tablet (768-1023px). On phones the toolbox is the
    // AddFieldSheet bottom sheet, opened from the build bar under the canvas.
    // Flat rail (no card): sticks under the top bar while the canvas scrolls with the page.
    <aside className="sticky top-16 hidden max-h-[calc(100dvh-5rem)] w-16 shrink-0 flex-col gap-4 self-start overflow-y-auto py-2 md:flex lg:w-64">
      <div className="hidden lg:block">
        <h3 className="bg-body font-bold text-(--text-primary) tracking-tight">Add fields</h3>
        <p className="bg-body-sm mt-1 text-(--text-muted)">Click or drag a field onto the form.</p>
      </div>

      <div className="relative hidden lg:block">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          aria-label="Search fields"
          className="min-h-11 w-full rounded-md border border-(--border-default) bg-(--surface-card) pl-9 pr-3 bg-body-sm outline-none focus:border-(--border-strong)"
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="bg-overline hidden text-(--text-muted) lg:block">Basic fields</h4>
        {fields.map((config) => (
          <DraggableToolboxItem key={config.type} config={config} onAdd={onAdd} />
        ))}
        {fields.length === 0 && <p className="bg-body-sm text-(--text-muted)">No fields match “{query}”.</p>}
      </div>
    </aside>
  );
}
