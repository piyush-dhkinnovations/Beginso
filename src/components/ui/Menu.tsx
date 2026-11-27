"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MoreVertical, Search } from "lucide-react";
import { bx } from "@/lib/utils";

export interface MenuItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** A colour dot in the icon's place. */
  swatch?: string;
  /** Makes the item a choice: the current one carries the tick, at the end. Leave unset for an action. */
  selected?: boolean;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  /** A label for the items after it ("My views"): not a button, not focusable, not clickable. */
  heading?: boolean;
}

const SEARCH_HEIGHT = 420;
// Enough to be worth opening below the trigger, even if there is more room above it.
const SEARCH_ENOUGH = 300;

/** The items whose label, or whose group's heading, holds the text; a heading stays only with something under it. */
function matching(items: MenuItem[], query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const has = (label: React.ReactNode) => typeof label === "string" && label.toLowerCase().includes(q);
  const found: MenuItem[] = [];
  let heading: MenuItem | null = null;
  let wholeGroup = false;
  for (const item of items) {
    if (item.heading) {
      heading = item;
      wholeGroup = has(item.label);
    } else if (wholeGroup || has(item.label)) {
      if (heading && !found.includes(heading)) found.push(heading);
      found.push(item);
    }
  }
  return found;
}

/** A titled set of choices ("Size", "Colour") with the current one ticked. */
export function menuChoices<T extends string | number>(
  heading: string,
  options: readonly { value: T; label: string; swatch?: string }[],
  current: T,
  onSelect: (value: T) => void
): MenuItem[] {
  return [
    { id: heading, label: heading, heading: true, onSelect: () => {} },
    ...options.map((o) => ({ id: `${heading}-${o.value}`, label: o.label, swatch: o.swatch, selected: o.value === current, onSelect: () => onSelect(o.value) })),
  ];
}

export interface MenuProps {
  /** Leave unset for the app's three-dot button. Set only for a button that says something else ("Export", a current value). */
  trigger?: React.ReactNode;
  triggerLabel?: string;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
  /** Overrides the trigger button's classes — defaults to the icon-button look every
   * row-action menu uses. */
  triggerClassName?: string;
  containerClassName?: string;
  /** Optional node rendered below all items, separated by a divider — used by ContextSwitcher for the "View all" link. */
  footer?: React.ReactNode;
  /**
   * For a long list of choices: a search box on top and the items two to a row, scrolling inside a panel of limited
   * height. The text is the box's placeholder and name. Item and heading labels must be plain strings to be found.
   */
  search?: string;
}

// The one menu format of the app. Callers pass data only; how it looks is decided here:
//   trigger   three vertical dots unless the button needs words
//   actions   icon, then label; destructive ones last, in red, under a line
//   choices   under a heading, the current one ticked at the end (see menuChoices)
//   long ones `search`: the same items behind a search box, in two columns
// Do not draw ticks, "Size: …" prefixes or a custom three-dot button at a call site.
//
// beginso-ui.css classes — see src/styles/beginso-ui.css §14 OVERLAYS ("Dropdown menu").
// Outside-click + keyboard nav are written here rather than introducing a positioning library —
// no such dependency exists in the project and none is justified for a simple below-trigger menu.
// Position type for the portaled dropdown — computed from the trigger's real screen position
// (see openMenu) rather than CSS absolute-positioned against a local `relative` ancestor.
interface MenuPosition {
  top?: number;
  bottom?: number;
  maxHeight?: number;
  left?: number;
  right?: number;
  width?: number;
}

export function Menu({ trigger = <MoreVertical className="bg-icon" aria-hidden="true" />, triggerLabel, items, align = "start", className, triggerClassName, containerClassName, footer, search }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const shown = search ? matching(items, query) : items;
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isFullWidth = containerClassName?.includes("w-full") ?? false;

  // Once one item has an icon or dot, the others keep its space so every label starts on the same line.
  const hasIconColumn = items.some((item) => !item.heading && (item.icon || item.swatch));

  const enabledIndexes = shown.reduce<number[]>((acc, item, i) => {
    if (!item.disabled && !item.heading) acc.push(i);
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
    // A long menu scrolls inside itself, so only the menu is then scrolled to the item. -1 is the search box.
    if (!isOpen || !position) return;
    if (activeIndex < 0) {
      searchRef.current?.focus({ preventScroll: true });
      return;
    }
    const item = itemRefs.current[activeIndex];
    item?.focus({ preventScroll: true });
    item?.scrollIntoView?.({ block: "nearest" });
  }, [isOpen, activeIndex, position]);

  // The dropdown is portaled to document.body and positioned with `fixed` coordinates (see
  // render below) rather than `absolute` inside its own local container — a trigger sitting
  // inside any scrollable/overflow-clipped ancestor (e.g. the collapsed sidebar rail, only 64px
  // wide) otherwise clips the dropdown instead of letting it extend past that ancestor's edge.
  // Closing on scroll (rather than re-measuring) matches this component's existing preference
  // for the simplest approach that actually works over a live-repositioning implementation
  // nothing here currently needs.
  useEffect(() => {
    if (!isOpen) return;
    // Scrolling the menu's own list is not the page moving.
    const handleScroll = (e: Event) => {
      if (!(e.target instanceof Node && menuRef.current?.contains(e.target))) setIsOpen(false);
    };
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
    setQuery("");
    // On a touch screen the search box is not focused: the keyboard would cover the list before it was read.
    const toSearch = search && !window.matchMedia?.("(pointer: coarse)").matches;
    setActiveIndex(toSearch ? -1 : Math.max(0, items.findIndex((item) => !item.disabled && !item.heading && (!search || item.selected))));
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      let vertical: MenuPosition;
      if (search) {
        // Held to the side of the trigger with more room, so it stays attached while a search shortens it.
        const below = window.innerHeight - rect.bottom - 14;
        const above = rect.top - 14;
        const down = below >= SEARCH_ENOUGH || below >= above;
        vertical = { ...(down ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }), maxHeight: Math.min(SEARCH_HEIGHT, down ? below : above) };
      } else {
        // Flip above the trigger when the menu would run off the bottom of the viewport.
        const estimatedHeight = items.length * 36 + 12;
        vertical = { top: rect.bottom + 6 + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - 6 - estimatedHeight) : rect.bottom + 6 };
      }
      setPosition(
        isFullWidth
          ? { ...vertical, left: rect.left, width: rect.width }
          : align === "end"
          ? { ...vertical, right: window.innerWidth - rect.right }
          : { ...vertical, left: rect.left }
      );
    }
    setIsOpen(true);
  };

  const move = (direction: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(activeIndex);
    // From the search box (not an item), down goes to the first match and up to the last.
    const nextPos = pos < 0 ? (direction === 1 ? 0 : enabledIndexes.length - 1) : (pos + direction + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[nextPos]);
  };

  const list = shown.map((item, i) => {
    const before = shown[i - 1];
    // A line sets apart each titled group, and the destructive actions, from what is above them.
    const separated = !!before && ((item.heading && !before.heading) || (!!item.danger && !before.danger));
    return (
      <React.Fragment key={item.id}>
        {separated && <div role="separator" className={bx("bg-menu-sep", search && "col-span-2")} />}
        {item.heading ? (
          <div role="presentation" className={bx("px-3 pb-1 pt-2 bg-body-sm font-semibold text-(--text-muted)", search && "col-span-2")}>
            {item.label}
          </div>
        ) : (
          <button
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            role={item.selected === undefined ? "menuitem" : "menuitemradio"}
            aria-checked={item.selected}
            type="button"
            disabled={item.disabled}
            tabIndex={-1}
            onClick={() => select(item)}
            className={bx("bg-menu-item", item.danger && "is-danger")}
          >
            {hasIconColumn && (
              <span className="bg-icon" aria-hidden="true">
                {item.swatch ? <span className="size-3 rounded-full" style={{ backgroundColor: item.swatch }} /> : item.icon}
              </span>
            )}
            {item.label}
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
            {item.selected && <Check size={16} className="ml-auto shrink-0" aria-hidden="true" />}
          </button>
        )}
      </React.Fragment>
    );
  });

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
        } else if (search && isOpen && e.key === "Enter" && e.target === searchRef.current) {
          e.preventDefault();
          const first = shown[enabledIndexes[0]];
          if (first && query.trim()) select(first);
        } else if (search && isOpen && e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && e.target !== searchRef.current) {
          // Typing while on an item carries on in the search box.
          setActiveIndex(-1);
          searchRef.current?.focus({ preventScroll: true });
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
          role={search ? "dialog" : "menu"}
          aria-label={triggerLabel}
          style={{
            position: "fixed",
            top: position.top,
            bottom: position.bottom,
            left: position.left,
            right: position.right,
            width: position.width,
            maxHeight: position.maxHeight ?? "calc(100dvh - 16px)",
            overflowY: search ? "hidden" : "auto",
          }}
          className={bx(
            // Above a drawer (scrim 80, panel 85) or a modal so a menu opened inside one is not hidden behind it; below toasts (90).
            "bg-menu z-88",
            isFullWidth ? "min-w-50" : "min-w-40",
            search && "flex w-96 max-w-[calc(100vw-1rem)] flex-col gap-1",
            className
          )}
        >
          {search ? (
            <>
              <div className="relative shrink-0">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(-1);
                  }}
                  placeholder={search}
                  aria-label={search}
                  className="min-h-10 w-full rounded-md border border-(--border-default) bg-(--surface-card) pl-9 pr-3 bg-body-sm outline-none focus:border-(--border-focus)"
                />
              </div>
              {shown.length === 0 ? (
                <p role="status" className="px-3 py-4 text-center bg-body-sm text-(--text-muted)">Nothing matches “{query.trim()}”.</p>
              ) : (
                <div role="menu" aria-label={triggerLabel} className="grid min-h-0 grid-cols-2 content-start gap-x-1 overflow-y-auto overscroll-contain">
                  {list}
                </div>
              )}
            </>
          ) : (
            list
          )}
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
