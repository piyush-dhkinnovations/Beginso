"use client";

import React from "react";
import { bx } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** Names the tablist for assistive tech when the surrounding page doesn't (e.g. "Settings"). */
  ariaLabel?: string;
  /**
   * The id of the panel each tab controls, for a caller that really renders one (role="tabpanel"). Without it no aria-controls is
   * written: it used to point at a "tabpanel-<id>" element nobody rendered, which axe reports as a critical error (QA A13-005).
   */
  panelId?: string | ((tabId: string) => string);
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §12 NAVIGATION ("Tabs"). WAI-ARIA tabs
// pattern: roving tabindex, arrow/Home/End keyboard navigation — matching the role="tablist"/
// role="tab"/aria-selected pattern already added to BuilderTabs (CHANGELOG.md, 2026-08-18).
export function Tabs({ tabs, activeId, onChange, className, ariaLabel, panelId }: TabsProps) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndSelect = (index: number) => {
    const next = tabs[index];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusAndSelect((index + 1) % tabs.length);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusAndSelect((index - 1 + tabs.length) % tabs.length);
        break;
      case "Home":
        e.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        e.preventDefault();
        focusAndSelect(tabs.length - 1);
        break;
    }
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={bx("bg-tabs", className)}>
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={typeof panelId === "function" ? panelId(tab.id) : panelId}
            tabIndex={selected ? 0 : -1}
            className="bg-tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.icon && <span className="bg-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
