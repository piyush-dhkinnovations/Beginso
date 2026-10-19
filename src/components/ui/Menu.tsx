"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** Optional node rendered below all items, separated by a divider — used by ContextSwitcher for the "View all" link. */
  footer?: React.ReactNode;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §14 OVERLAYS ("Dropdown menu").
// Outside-click + keyboard nav follows the existing pattern in
// src/components/responses/StatusDropdown.tsx rather than introducing a positioning library —
// no such dependency exists in the project and none is justified for a simple below-trigger menu.
// Position type for the portaled dropdown — computed from the trigger's real screen position
// (see openMenu) rather than CSS absolute-positioned against a local `relative` ancestor.
interface MenuPosition {
  top: number;
  left?: number;
  right?: number;
  width?: number;
}

export function Menu({ trigger, triggerLabel, items, align = "start", className, triggerClassName, containerClassName, footer }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isFullWidth = containerClassName?.includes("w-full") ?? false;

  const enabledIndexes = items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i);
    return acc;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    // preventScroll: focusing an item that sits below the fold must not scroll the page, which would close the menu.
    if (isOpen) itemRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [isOpen, activeIndex]);

  // The dropdown is portaled to document.body and positioned with `fixed` coordinates (see
  // render below) rather than `absolute` inside its own local container — a trigger sitting
  // inside any scrollable/overflow-clipped ancestor (e.g. the collapsed sidebar rail, only 64px
  // wide) otherwise clips the dropdown instead of letting it extend past that ancestor's edge.
  // Closing on scroll (rather than re-measuring) matches this component's existing preference
  // for the simplest approach that actually works over a live-repositioning implementation
  // nothing here currently needs.
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  // Keep the portaled menu inside the viewport: a start-aligned menu on a trigger near the right edge
  // (or an end-aligned one near the left) otherwise runs off-screen on phones.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!isOpen || !el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    if (r.right > window.innerWidth - margin || r.left < margin) {
      const left = Math.max(margin, Math.min(r.left, window.innerWidth - margin - r.width));
      el.style.left = `${left}px`;
      el.style.right = "auto";
    }
  }, [isOpen, position]);

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
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // Flip above the trigger when the menu would run off the bottom of the viewport.
      const estimatedHeight = items.length * 36 + 12;
      const top = rect.bottom + 6 + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - 6 - estimatedHeight) : rect.bottom + 6;
      setPosition(
        isFullWidth
          ? { top, left: rect.left, width: rect.width }
          : align === "end"
          ? { top, right: window.innerWidth - rect.right }
          : { top, left: rect.left }
      );
    }
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
      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={triggerLabel}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            right: position.right,
            width: position.width,
            maxHeight: "calc(100dvh - 16px)",
            overflowY: "auto",
          }}
          className={bx(
            "bg-menu z-50",
            isFullWidth ? "min-w-[200px]" : "min-w-[160px]",
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
          {footer && (
            <div className="border-t border-(--border-subtle) mt-1 pt-1">
              {footer}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
