"use client";

import React from "react";
import { bx } from "@/lib/utils";

export interface SegmentedRadioOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Shown as the native tooltip, and the only visible hint when the label is hidden at small widths. */
  title?: string;
}

export interface SegmentedRadioProps {
  options: SegmentedRadioOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** Hide the text labels (icons only) below this width: they stay in the accessible name. */
  iconOnlyBelow?: "lg" | "md";
  className?: string;
}

// A real radio group (one stop in the Tab order, arrow keys move AND select), for choices that are exclusive and apply at once -
// unlike Segmented, whose buttons are independent toggles. Same look: beginso-ui.css "Segmented control".
export function SegmentedRadio({ options, value, onChange, ariaLabel, iconOnlyBelow, className }: SegmentedRadioProps) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (index: number) => {
    const next = options[(index + options.length) % options.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        select(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        select(index - 1);
        break;
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(options.length - 1);
        break;
    }
  };

  const hideLabel = iconOnlyBelow === "lg" ? "max-lg:sr-only" : iconOnlyBelow === "md" ? "max-md:sr-only" : "";

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={bx("bg-segmented", className)}>
      {options.map((o, index) => {
        const checked = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[o.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={o.title}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className="inline-flex items-center gap-1.5 max-md:min-h-10 max-md:min-w-10 max-md:justify-center"
          >
            {o.icon}
            <span className={hideLabel}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
