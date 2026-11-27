'use client';

import { ArrowRightLeft, Repeat2 } from 'lucide-react';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { useOptionalToast } from '@/components/ui/Toast';
import { useBuilderStore } from '@/store/builderStore';
import type { FieldType, FormField } from '@/types/form';
import { FIELD_GROUPS, FIELD_TYPE_CONFIG } from './Toolbox';

export const cardActionClass =
  'flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-(--text-disabled) transition-all hover:bg-(--accent-soft) hover:text-(--accent-soft-text)';

/**
 * The card's "change type" icon: every field type, searchable, under the toolbox's group headings, with the current one
 * ticked.
 */
export function FieldTypeMenu({ field }: { field: FormField }) {
  const changeFieldType = useBuilderStore((s) => s.changeFieldType);
  const toast = useOptionalToast();

  const change = (type: FieldType) => {
    const rules = () => useBuilderStore.getState().fields.find((f) => f.fieldId === field.fieldId)?.logicRules?.length ?? 0;
    const before = rules();
    changeFieldType(field.fieldId, type);
    const removed = before - rules();
    if (removed > 0) {
      toast?.toast(
        `Removed ${removed === 1 ? 'a condition' : `${removed} conditions`} that checked this question: the new type can never match. Undo brings ${removed === 1 ? 'it' : 'them'} back.`,
        'warning',
        8000
      );
    }
  };

  const items: MenuItem[] = FIELD_GROUPS.flatMap((group) => [
    // Its own id: the "datetime" group and the "datetime" type would otherwise share one.
    { id: `group-${group.id}`, label: group.label, heading: true, onSelect: () => {} },
    ...FIELD_TYPE_CONFIG.filter((c) => c.group === group.id).map(({ type, label, icon: Icon }) => ({
      id: type,
      label,
      icon: <Icon size={14} />,
      selected: type === field.type,
      onSelect: () => change(type),
    })),
  ]);

  return (
    // Clicks here must not select/deselect the card underneath.
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <Menu
        trigger={<Repeat2 size={16} />}
        triggerLabel={`Change the type of ${field.label}`}
        items={items}
        search="Search field types"
        align="end"
        triggerClassName={cardActionClass}
      />
    </span>
  );
}

/** "Move to page", shown only when there is another page to move to. */
export function FieldPageMenu({ field }: { field: FormField }) {
  const pages = useBuilderStore((s) => s.pages);
  const moveFieldToPage = useBuilderStore((s) => s.moveFieldToPage);

  const items = pages
    .filter((p) => p.id !== field.pageId)
    .map((p) => ({ id: p.id, label: p.title?.trim() || `Page ${p.order + 1}`, onSelect: () => moveFieldToPage(field.fieldId, p.id) }));
  if (items.length === 0) return null;

  return (
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <Menu trigger={<ArrowRightLeft size={16} />} triggerLabel={`Move ${field.label} to another page`} items={items} align="end" triggerClassName={cardActionClass} />
    </span>
  );
}
