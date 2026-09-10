"use client";

import React, { useEffect, useRef, useState } from "react";
import { bx } from "@/lib/utils";

export interface MenuItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export interface MenuProps {
  trigger: React.ReactNode;
  triggerLabel?: string;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
  /** Overrides the trigger button's classes — defaults to the icon-button look every existing
   * row-action menu uses. Added for ContextSwitcher (sprint-8), which needs a labelled
   * secondary-button trigger instead; every other caller is unaffected by the default. */
  triggerClassName?: string;
  containerClassName?: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §14 OVERLAYS ("Dropdown menu").
// Outside-click + keyboard nav follows the existing pattern in
// src/components/responses/StatusDropdown.tsx rather than introducing a positioning library —
// no such dependency exists in the project and none is justified for a simple below-trigger menu.
export function Menu({ trigger, triggerLabel, items, align = "start", className, triggerClassName, containerClassName }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i);
    return acc;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) itemRefs.current[activeIndex]?.focus();
  }, [isOpen, activeIndex]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const select = (item: MenuItem) => {
    if (item.disabled) return;
    close();
    item.onSelect();
  };

  const openMenu = () => {
    setActiveIndex(enabledIndexes[0] ?? 0);
    setIsOpen(true);
  };

  const move = (direction: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(activeIndex);
    const nextPos = (pos + direction + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[nextPos]);
  };

  return (
    <div
      className={bx("relative", containerClassName ?? "inline-block")}
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isOpen) {
          e.preventDefault();
          e.stopPropagation();
          close();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          isOpen ? move(1) : openMenu();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          isOpen ? move(-1) : openMenu();
        } else if (e.key === "Tab" && isOpen) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        onClick={() => (isOpen ? close() : openMenu())}
        className={triggerClassName ?? "bg-btn bg-btn-ghost bg-btn-icon"}
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          role="menu"
          className={bx(
            "bg-menu absolute mt-1.5 z-50",
            align === "end" ? "right-0" : "left-0",
            containerClassName?.includes("w-full") ? "w-full min-w-[200px]" : "min-w-[160px]",
            className
          )}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              tabIndex={-1}
              onClick={() => select(item)}
              className={bx("bg-menu-item", item.danger && "is-danger")}
            >
              {item.icon && <span className="bg-icon">{item.icon}</span>}
              {item.label}
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
