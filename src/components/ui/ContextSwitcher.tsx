import React from "react";
import { ChevronsUpDown } from "lucide-react";
import { bx } from "@/lib/utils";

export interface ContextSwitcherWorkspace {
  id: string;
  name: string;
}

export interface ContextSwitcherProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  currentLabel?: string;
  workspaces?: ContextSwitcherWorkspace[];
}

// Inert shell only (requirements.md 2.4, non-goals): a static "current context" trigger with
// no dropdown wired to real data. Must render safely with no workspace list — Sprint 8 adds
// the actual switching logic and dropdown content.
export function ContextSwitcher({
  currentLabel = "Personal",
  workspaces = [],
  className,
  ...props
}: ContextSwitcherProps) {
  return (
    <button
      type="button"
      aria-haspopup="true"
      aria-label={`Switch context, currently ${currentLabel}`}
      className={bx("bg-btn", "bg-btn-secondary", className)}
      {...props}
    >
      <span>{currentLabel}</span>
      {workspaces.length > 0 && <span className="bg-count">{workspaces.length}</span>}
      <ChevronsUpDown className="bg-icon" aria-hidden="true" />
    </button>
  );
}
