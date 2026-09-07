import { ChevronsUpDown } from "lucide-react";
import { bx } from "@/lib/utils";
import { Menu } from "./Menu";
import type { MenuItem } from "./Menu";
import { Badge } from "./Badge";

export interface ContextSwitcherWorkspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export type ContextSwitcherTarget =
  | { type: "personal" }
  | { type: "workspace"; workspace: ContextSwitcherWorkspace };

export interface ContextSwitcherProps {
  currentLabel?: string;
  workspaces?: ContextSwitcherWorkspace[];
  /** When omitted, renders Sprint 7's original inert trigger (no dropdown) — preserves the
   * existing "safe with no props" behavior for any caller not yet ready to wire real data. */
  onSelect?: (target: ContextSwitcherTarget) => void;
  className?: string;
}

// Sprint 7 built this as an inert shell — a static trigger with no dropdown wired to real data.
// Sprint 8 Day 2 adds the real switching logic: reuses ui/Menu wholesale (not just its CSS
// classes) for keyboard nav (arrow keys, Enter, Escape), outside-click-close, and
// focus-restore-to-trigger, rather than reimplementing all three a second time
// (requirements.md §7.2, §11) — Menu already does exactly this for row-action menus.
export function ContextSwitcher({
  currentLabel = "Personal",
  workspaces = [],
  onSelect,
  className,
}: ContextSwitcherProps) {
  const triggerLabel = `Switch context, currently ${currentLabel}`;
  const triggerContent = (
    <>
      <span>{currentLabel}</span>
      {workspaces.length > 0 && <span className="bg-count">{workspaces.length}</span>}
      <ChevronsUpDown className="bg-icon" aria-hidden="true" />
    </>
  );
  const triggerClassName = bx("bg-btn", "bg-btn-secondary", className);

  if (!onSelect) {
    return (
      <button type="button" aria-haspopup="true" aria-label={triggerLabel} className={triggerClassName}>
        {triggerContent}
      </button>
    );
  }

  const items: MenuItem[] = [
    { id: "personal", label: "Personal", onSelect: () => onSelect({ type: "personal" }) },
    ...workspaces.map(
      (workspace): MenuItem => ({
        id: workspace.id,
        label: (
          <span className="flex w-full items-center justify-between gap-3">
            <span>{workspace.name}</span>
            {workspace.role && <Badge>{workspace.role}</Badge>}
          </span>
        ),
        onSelect: () => onSelect({ type: "workspace", workspace }),
      })
    ),
  ];

  return <Menu trigger={triggerContent} triggerLabel={triggerLabel} triggerClassName={triggerClassName} items={items} />;
}
