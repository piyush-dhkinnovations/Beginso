"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { bx } from "@/lib/utils";
import { Menu } from "./Menu";

export interface FilterChip {
  id: string;
  label: string;
  /** Omit when the count is not cheaply available — never pass a guessed number. */
  count?: number;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
  /**
   * `tabs` draws underlined tabs that sit on a rule the caller draws, on one line: the ones that do not fit the width they are given
   * move into a "More" menu (the selected one always stays visible). Default is wrapping pills.
   */
  variant?: "pills" | "tabs";
}

const GAP = 4; // gap-1, in px: the tab row's gap, needed to add up widths

// Count filter chips (`All 77 · Unread 71 · New 16`) — replaces stat-card bands above lists.
// Plain toggle buttons (aria-pressed), one active at a time; clicking a chip filters the list.
export function FilterChips({ chips, activeId, onChange, ariaLabel, className, variant = "pills" }: FilterChipsProps) {
  const tabs = variant === "tabs";
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null); // null = all fit (or not measured yet)

  // Measure every tab (and the More button) in a hidden copy, then keep as many as fit the row's width. Runs again whenever the row is
  // resized or the chips change, so it follows the window and the sidebar with no breakpoints.
  useLayoutEffect(() => {
    if (!tabs) return;
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;
    const fit = () => {
      const widths = Array.from(measure.children).map((el) => (el as HTMLElement).offsetWidth);
      const moreWidth = widths.pop() ?? 0;
      const available = root.clientWidth;
      const total = widths.reduce((sum, w) => sum + w, 0) + GAP * Math.max(0, widths.length - 1);
      if (available === 0 || total <= available) return setVisibleIds((prev) => (prev === null ? prev : null));
      // The selected tab is always kept, then the others in order while they fit beside the More button.
      const keep = new Set<string>();
      let used = moreWidth + GAP;
      const activeIndex = chips.findIndex((c) => c.id === activeId);
      if (activeIndex >= 0) {
        keep.add(chips[activeIndex].id);
        used += widths[activeIndex] + GAP;
      }
      chips.forEach((chip, i) => {
        if (keep.has(chip.id) || used + widths[i] > available) return;
        keep.add(chip.id);
        used += widths[i] + GAP;
      });
      const next = chips.filter((c) => keep.has(c.id)).map((c) => c.id);
      setVisibleIds((prev) => (prev && prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    return () => observer.disconnect();
  }, [tabs, chips, activeId]);

  const button = (chip: FilterChip, measuring = false) => {
    const active = chip.id === activeId;
    return (
      <button
        key={chip.id}
        type="button"
        aria-pressed={measuring ? undefined : active}
        tabIndex={measuring ? -1 : undefined}
        onClick={() => onChange(chip.id)}
        className={bx(
          "inline-flex items-center gap-1.5 bg-body-sm font-medium transition-colors",
          tabs
            ? bx(
                "-mb-px h-10 shrink-0 whitespace-nowrap border-b-2 px-3",
                active
                  ? "border-(--action-primary) text-(--action-primary)"
                  : "border-transparent text-(--text-secondary) hover:border-(--border-default) hover:text-(--text-primary)"
              )
            : bx(
                "h-8 rounded-full border px-3",
                active
                  ? "border-transparent bg-(--accent-soft) text-(--accent-soft-text)"
                  : "border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)"
              )
        )}
      >
        {chip.label}
        {chip.count !== undefined && " "}
        {chip.count !== undefined && (
          <span className={bx("tabular-nums", active ? (tabs ? "text-(--action-primary)" : "text-(--accent-soft-text)") : "text-(--text-muted)")}>{chip.count}</span>
        )}
      </button>
    );
  };

  const shown = tabs && visibleIds ? chips.filter((c) => visibleIds.includes(c.id)) : chips;
  const hidden = tabs && visibleIds ? chips.filter((c) => !visibleIds.includes(c.id)) : [];
  const moreTrigger = (
    <>
      More
      <ChevronDown size={14} aria-hidden="true" />
    </>
  );
  const moreClass = "bg-body-sm -mb-px inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-3 font-medium text-(--text-secondary) hover:text-(--text-primary)";

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={ariaLabel}
      className={bx("relative flex items-center", tabs ? "min-w-0 flex-1 gap-1" : "flex-wrap gap-2", className)}
    >
      {shown.map((chip) => button(chip))}
      {hidden.length > 0 && (
        <Menu
          triggerLabel={`More filters, ${hidden.length}`}
          triggerClassName={moreClass}
          trigger={moreTrigger}
          items={hidden.map((chip) => ({
            id: chip.id,
            label: chip.count !== undefined ? `${chip.label} ${chip.count}` : chip.label,
            onSelect: () => onChange(chip.id),
          }))}
        />
      )}
      {tabs && (
        // Clipped to nothing, so the full-width copy never makes the page scroll sideways.
        <div aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 h-0 w-full overflow-hidden">
          <div ref={measureRef} className="flex w-max gap-1 whitespace-nowrap">
            {chips.map((chip) => button(chip, true))}
            <span className={moreClass}>{moreTrigger}</span>
          </div>
        </div>
      )}
    </div>
  );
}
