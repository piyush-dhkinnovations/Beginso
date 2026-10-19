'use client';

import { ArrowRightLeft, Repeat2 } from 'lucide-react';
import { Menu } from '@/components/ui/Menu';
import { useBuilderStore } from '@/store/builderStore';
import { convertibleTypes } from '@/lib/fieldConversion';
import type { FormField } from '@/types/form';
import { FIELD_TYPE_CONFIG } from './Toolbox';

const triggerClass =
  'flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-(--text-disabled) transition-all hover:bg-(--accent-soft) hover:text-(--accent-soft-text)';

/** Two small icon menus for a field card: "Move to page" and "Change type". Each shows only when it has somewhere to go. */
export function FieldMoveMenus({ field }: { field: FormField }) {
  const pages = useBuilderStore((s) => s.pages);
  const moveFieldToPage = useBuilderStore((s) => s.moveFieldToPage);
  const changeFieldType = useBuilderStore((s) => s.changeFieldType);

  const pageItems = pages
    .filter((p) => p.id !== field.pageId)
    .map((p) => ({ id: p.id, label: p.title?.trim() || `Page ${p.order + 1}`, onSelect: () => moveFieldToPage(field.fieldId, p.id) }));
  const typeItems = convertibleTypes(field.type).map((t) => {
    const cfg = FIELD_TYPE_CONFIG.find((c) => c.type === t);
    const Icon = cfg?.icon;
    return { id: t, label: cfg?.label ?? t, icon: Icon ? <Icon size={14} /> : undefined, onSelect: () => changeFieldType(field.fieldId, t) };
  });

  return (
    // Clicks here must not select/deselect the card underneath.
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      {pageItems.length > 0 && (
        <Menu trigger={<ArrowRightLeft size={16} />} triggerLabel={`Move ${field.label} to another page`} items={pageItems} align="end" triggerClassName={triggerClass} />
      )}
      {typeItems.length > 0 && (
        <Menu trigger={<Repeat2 size={16} />} triggerLabel={`Change the type of ${field.label}`} items={typeItems} align="end" triggerClassName={triggerClass} />
      )}
    </span>
  );
}
