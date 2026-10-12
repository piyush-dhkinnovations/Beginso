'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
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
  Star,
  ToggleLeft,
  Link2,
  Clock,
  CalendarClock,
  IndianRupee,
  MapPin,
  PenLine,
  Image as ImageIcon,
  Search,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import type { FieldType } from '@/types/form';

export type FieldGroup = 'text' | 'choice' | 'datetime' | 'uploads';

export const FIELD_GROUPS: { id: FieldGroup; label: string }[] = [
  { id: 'text', label: 'Text & contact' },
  { id: 'choice', label: 'Choice & rating' },
  { id: 'datetime', label: 'Date & time' },
  { id: 'uploads', label: 'Uploads & signature' },
];

export interface FieldTypeConfig {
  type: FieldType;
  icon: LucideIcon;
  label: string;
  group: FieldGroup;
}

// Listed in group order, so the flat list used by the mobile sheet reads in the same order as the rail.
export const FIELD_TYPE_CONFIG: FieldTypeConfig[] = [
  { type: 'short_text', icon: Type, label: 'Short Text', group: 'text' },
  { type: 'long_text', icon: AlignLeft, label: 'Long Text', group: 'text' },
  { type: 'email', icon: Mail, label: 'Email', group: 'text' },
  { type: 'phone', icon: Phone, label: 'Phone', group: 'text' },
  { type: 'number', icon: Hash, label: 'Number', group: 'text' },
  { type: 'currency', icon: IndianRupee, label: 'Currency', group: 'text' },
  { type: 'url', icon: Link2, label: 'Website / URL', group: 'text' },
  { type: 'address', icon: MapPin, label: 'Address', group: 'text' },
  { type: 'dropdown', icon: ChevronDown, label: 'Dropdown', group: 'choice' },
  { type: 'multiple_choice', icon: List, label: 'Multiple Choice', group: 'choice' },
  { type: 'checkbox', icon: CheckSquare, label: 'Checkbox', group: 'choice' },
  { type: 'yes_no', icon: ToggleLeft, label: 'Yes / No', group: 'choice' },
  { type: 'rating', icon: Star, label: 'Rating', group: 'choice' },
  { type: 'date', icon: Calendar, label: 'Date', group: 'datetime' },
  { type: 'time', icon: Clock, label: 'Time', group: 'datetime' },
  { type: 'datetime', icon: CalendarClock, label: 'Date & Time', group: 'datetime' },
  { type: 'file_upload', icon: Upload, label: 'File Upload', group: 'uploads' },
  { type: 'image_upload', icon: ImageIcon, label: 'Image Upload', group: 'uploads' },
  { type: 'signature', icon: PenLine, label: 'Signature', group: 'uploads' },
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
  // One group open at a time keeps the rail shorter than the viewport, so it needs no scrollbar of its own
  // (the page is the only thing that scrolls). A search opens every group that has a match.
  const [openGroup, setOpenGroup] = useState<FieldGroup>('text');
  return (
    // Sprint 13 (CF2.12): the rail is full width from 1024px and icon-only on tablet (768-1023px). On phones the toolbox is the
    // AddFieldSheet bottom sheet, opened from the build bar under the canvas.
    // Flat rail (no card): sticks under the top bar while the canvas scrolls with the page.
    <aside className="sticky top-16 hidden w-16 shrink-0 flex-col gap-4 self-start py-2 md:flex lg:w-64">
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
        {FIELD_GROUPS.map((group) => {
          const items = fields.filter((c) => c.group === group.id);
          if (items.length === 0) return null;
          const open = q !== '' || openGroup === group.id;
          return (
            <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenGroup(group.id)}
                className="hidden min-h-9 items-center justify-between rounded-md px-1 bg-overline text-(--text-muted) hover:text-(--text-primary) lg:flex"
              >
                <span>{group.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-caption font-normal normal-case tracking-normal">{items.length}</span>
                  <ChevronRight size={14} aria-hidden="true" className={cn('transition-transform', open && 'rotate-90')} />
                </span>
              </button>
              {/* The icon-only tablet rail has no headings to open, so it always lists every field. */}
              <div className={cn('flex-col gap-2', open ? 'flex' : 'hidden max-lg:flex')}>
                {items.map((config) => (
                  <DraggableToolboxItem key={config.type} config={config} onAdd={onAdd} />
                ))}
              </div>
            </section>
          );
        })}
        {fields.length === 0 && <p className="bg-body-sm text-(--text-muted)">No fields match “{query}”.</p>}
      </div>
    </aside>
  );
}
