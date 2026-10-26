"use client";

import { Check, ChevronDown } from "lucide-react";
import { Menu, type MenuItem } from "./Menu";

export interface FilterMenuOption {
  id: string;
  label: string;
}

export interface FilterMenuProps {
  /** Button name: "Tags", "Assignee", "Date". */
  label: string;
  options: FilterMenuOption[];
  /** Selected option id(s); empty/undefined = no filter. */
  selectedIds?: string[];
  /** Text shown on the button when a filter is active, e.g. the assignee's name. Defaults to the selected option's label. */
  valueLabel?: string;
  onSelect: (id: string) => void;
  /** Called by the leading "Any" item. */
  onClear: () => void;
  clearLabel?: string;
  /** More items after the options, for something that is not one more option (a custom range opens its own dialog). */
  extraItems?: MenuItem[];
}

// A named filter button that shows its active value and closes after a selection (it is a Menu,
// which closes on select). Single-select per open; reopen to change.
export function FilterMenu({ label, options, selectedIds = [], valueLabel, onSelect, onClear, clearLabel = "Any", extraItems = [] }: FilterMenuProps) {
  const active = selectedIds.length > 0;
  const value = valueLabel ?? (active ? options.find((o) => o.id === selectedIds[0])?.label : undefined);
  const check = (on: boolean) => (on ? <Check size={14} aria-hidden="true" /> : <span className="inline-block w-3.5" />);
  return (
    <Menu
      triggerLabel={active && value ? `${label}: ${value}` : label}
      triggerClassName={active ? "bg-btn bg-btn-secondary bg-btn-sm border-(--action-primary)" : "bg-btn bg-btn-ghost bg-btn-sm"}
      trigger={
        <>
          {/* one text run, so the colon sits against the name ("Show: Similar responses only") and not a gap away from it */}
          <span className="inline-flex min-w-0 items-baseline whitespace-nowrap">
            {label}
            {active && value && <span className="max-w-40 truncate font-semibold text-(--text-primary)">: {value}</span>}
          </span>
          <ChevronDown size={14} aria-hidden="true" />
        </>
      }
      items={[
        { id: "__any", label: clearLabel, icon: check(!active), onSelect: onClear },
        ...options.map((o) => ({ id: o.id, label: o.label, icon: check(selectedIds.includes(o.id)), onSelect: () => onSelect(o.id) })),
        ...extraItems,
      ]}
    />
  );
}
