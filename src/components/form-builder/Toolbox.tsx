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

// Colour lives on the icon only (one hue per group), so the rail stays calm but a field is findable at a glance.
export const GROUP_ICON_COLOR: Record<FieldGroup, string> = {
  text: 'text-(--action-primary)',
  choice: 'text-violet-600',
  datetime: 'text-(--warning)',
  uploads: 'text-(--success)',
};

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
      className={`group flex items-center justify-center gap-2.5 px-0 py-2.5 rounded-lg bg-(--surface-card) border border-(--border-default) cursor-grab active:cursor-grabbing hover:bg-(--surface-hover) hover:border-(--border-strong) transition-colors select-none min-h-11 lg:min-h-10 lg:justify-start lg:px-2.5 lg:py-2 ${
        isDragging ? 'opacity-50 border-(--border-focus) ring-1 ring-(--border-focus)/20' : ''
      }`}
    >
      <Icon size={16} className={`${GROUP_ICON_COLOR[config.group]} shrink-0`} />
      <span className="hidden min-w-0 lg:inline bg-body-sm font-medium leading-tight text-(--text-secondary) group-hover:text-(--text-primary)">{label}</span>
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
    <aside className="sticky top-16 hidden w-16 shrink-0 flex-col gap-4 self-start rounded-xl border border-(--border-default) bg-(--surface-card) p-2 md:flex lg:w-72 lg:p-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="hidden border-b border-(--border-subtle) pb-3 lg:block">
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

      <div className="flex flex-col gap-4">
        {FIELD_GROUPS.map((group) => {
          const items = fields.filter((c) => c.group === group.id);
          if (items.length === 0) return null;
          return (
            <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
              {/* Every group is always shown: nothing is hidden behind a heading. The icon-only tablet rail has no headings. */}
              <h4 className="hidden bg-body-sm font-semibold text-(--text-primary) lg:block">{group.label}</h4>
              <div className="flex flex-col gap-2">
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
