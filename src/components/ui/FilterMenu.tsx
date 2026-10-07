"use client";

import { Check, ChevronDown } from "lucide-react";
import { Menu } from "./Menu";

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
}

// A named filter button that shows its active value and closes after a selection (it is a Menu,
// which closes on select). Single-select per open; reopen to change.
export function FilterMenu({ label, options, selectedIds = [], valueLabel, onSelect, onClear, clearLabel = "Any" }: FilterMenuProps) {
  const active = selectedIds.length > 0;
  const value = valueLabel ?? (active ? options.find((o) => o.id === selectedIds[0])?.label : undefined);
  const check = (on: boolean) => (on ? <Check size={14} aria-hidden="true" /> : <span className="inline-block w-3.5" />);
  return (
    <Menu
      triggerLabel={active && value ? `${label}: ${value}` : label}
      triggerClassName={active ? "bg-btn bg-btn-secondary bg-btn-sm border-(--action-primary)" : "bg-btn bg-btn-ghost bg-btn-sm"}
      trigger={
        <>
          {label}
          {active && value && <span className="max-w-32 truncate font-semibold text-(--text-primary)">: {value}</span>}
          <ChevronDown size={14} aria-hidden="true" />
        </>
      }
      items={[
        { id: "__any", label: clearLabel, icon: check(!active), onSelect: onClear },
        ...options.map((o) => ({ id: o.id, label: o.label, icon: check(selectedIds.includes(o.id)), onSelect: () => onSelect(o.id) })),
      ]}
    />
  );
}
