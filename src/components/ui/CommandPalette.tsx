"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Search } from "lucide-react";
import { bx } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface CommandPaletteItem {
  id: string;
  /** Row content. The palette owns the option wrapper, highlight and ARIA - not the markup inside. */
  content: React.ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteGroup {
  id: string;
  label: string;
  items: CommandPaletteItem[];
  /** A muted line under the heading (a scope label, or a per-group inline error). */
  note?: React.ReactNode;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  groups: CommandPaletteGroup[];
  /** Accessible name of the dialog and the input, e.g. "Search". */
  label: string;
  placeholder?: string;
  maxLength?: number;
  /** Shown above the list, e.g. the "Searching Acme" scope note. */
  header?: React.ReactNode;
  /** Shown instead of the list when there is nothing to list (hint, skeleton, empty or error state). */
  emptyState?: React.ReactNode;
  /** Pinned under the list, e.g. keyboard hints. */
  footer?: React.ReactNode;
  /** Polite live-region text, e.g. "7 results". Debounce it in the caller so it does not chatter. */
  statusText?: string;
}

// beginso-ui.css §Command palette (.bg-palette). Dialog + combobox + listbox: focus stays on the
// input, the highlight is `aria-activedescendant`, Arrow keys move across the flattened result list
// (group headings are skipped), Enter selects, Escape closes and restores focus to the opener
// (useFocusTrap). It owns NO data or search logic - callers supply `groups` (Sprint 14, OQ-8).
// Below 640px it is a full-screen sheet with a back chevron.
export function CommandPalette({
  isOpen,
  onClose,
  query,
  onQueryChange,
  groups,
  label,
  placeholder,
  maxLength,
  header,
  emptyState,
  footer,
  statusText,
}: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (id: string) => `${baseId}-opt-${id}`;
  const [activeId, setActiveId] = useState<string | null>(null);

  useFocusTrap(isOpen, onClose, dialogRef);

  // The trap focuses the first focusable (the mobile back button); the input is the real target.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // Highlight falls back to the first row whenever the previous one is no longer in the list.
  const current = flat.find((i) => i.id === activeId) ?? flat[0];

  useEffect(() => {
    if (!current || !listRef.current) return;
    listRef.current.querySelector<HTMLElement>(`[id="${optionId(current.id)}"]`)?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!isOpen || typeof document === "undefined") return null;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (flat.length === 0) return;
    const index = Math.max(0, flat.findIndex((i) => i.id === current?.id));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveId(flat[(index + 1) % flat.length].id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveId(flat[(index - 1 + flat.length) % flat.length].id);
    } else if (e.key === "Home" && e.ctrlKey) {
      e.preventDefault();
      setActiveId(flat[0].id);
    } else if (e.key === "Enter" && current) {
      e.preventDefault();
      current.onSelect();
    }
  }

  const visibleGroups = groups.filter((g) => g.items.length > 0 || g.note);

  return createPortal(
    <div
      role="presentation"
      className="bg-scrim sm:items-start sm:pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={dialogRef}
        className="bg-palette max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:w-160!"
      >
        <div className="bg-palette-input">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className={bx("bg-btn", "bg-btn-ghost", "bg-btn-icon", "sm:hidden")}
          >
            <ArrowLeft className="bg-icon" aria-hidden="true" />
          </button>
          <Search className="bg-icon max-sm:hidden" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={label}
            aria-expanded={flat.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={current ? optionId(current.id) : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            maxLength={maxLength}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="bg-kbd max-sm:hidden" aria-hidden="true">ESC</kbd>
        </div>

        {header && <div className="px-5 pt-3 bg-caption text-(--text-muted)">{header}</div>}

        <div ref={listRef} className="bg-palette-list max-sm:max-h-none max-sm:flex-1">
          <div id={listboxId} role="listbox" aria-label={`${label} results`} className={visibleGroups.length === 0 ? "hidden" : undefined}>
            {visibleGroups.map((group) => (
              <div key={group.id} role="group" aria-labelledby={`${baseId}-grp-${group.id}`} className="py-1">
                <div id={`${baseId}-grp-${group.id}`} className="px-3 pb-1 pt-2 bg-overline text-(--text-muted)">
                  {group.label}
                </div>
                {group.note && <div className="px-3 pb-1 bg-caption text-(--text-muted)">{group.note}</div>}
                {group.items.map((item) => {
                  const active = item.id === current?.id;
                  return (
                    <div
                      key={item.id}
                      id={optionId(item.id)}
                      role="option"
                      aria-selected={active}
                      onMouseMove={() => active || setActiveId(item.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={item.onSelect}
                      className={bx(
                        "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2",
                        active ? "bg-(--surface-hover)" : "bg-transparent",
                      )}
                    >
                      {item.content}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {visibleGroups.length === 0 && emptyState}
        </div>

        <p role="status" aria-live="polite" className="sr-only">{statusText}</p>
        {footer && <div className="border-t border-(--border-subtle) px-5 py-3 bg-caption text-(--text-muted)">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
