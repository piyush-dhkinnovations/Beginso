import { ChevronsUpDown, User, Building2 } from "lucide-react";
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
  collapsed?: boolean;
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
  collapsed = false,
}: ContextSwitcherProps) {
  const triggerLabel = `Switch context, currently ${currentLabel}`;
  const isPersonal = currentLabel.toLowerCase() === "personal";
  const Icon = isPersonal ? User : Building2;

  const items: MenuItem[] = onSelect
    ? [
        {
          id: "personal",
          label: (
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span className="truncate font-medium">Personal</span>
              </span>
              <span className="text-[11px] text-text-muted shrink-0">Only you</span>
            </span>
          ),
          onSelect: () => onSelect({ type: "personal" }),
        },
        ...workspaces.map(
          (workspace): MenuItem => ({
            id: workspace.id,
            label: (
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="truncate font-medium">{workspace.name}</span>
                </span>
                {workspace.role && <Badge>{workspace.role}</Badge>}
              </span>
            ),
            onSelect: () => onSelect({ type: "workspace", workspace }),
          })
        ),
      ]
    : [];

  if (collapsed) {
    const compactContent = (
      <span className="flex items-center justify-center w-full h-full" title={triggerLabel}>
        <Icon className="w-4 h-4 text-text-secondary" aria-hidden="true" />
      </span>
    );
    const compactTriggerClassName = bx(
      "bg-btn bg-btn-secondary w-10 h-10 p-0 !justify-center rounded-lg shadow-xs hover:bg-surface-hover hover:border-border-strong",
      className
    );

    if (!onSelect) {
      return (
        <button
          type="button"
          aria-haspopup="true"
          aria-label={triggerLabel}
          className={compactTriggerClassName}
        >
          {compactContent}
        </button>
      );
    }

    return (
      <Menu
        trigger={compactContent}
        triggerLabel={triggerLabel}
        triggerClassName={compactTriggerClassName}
        items={items}
        align="start"
      />
    );
  }

  const triggerContent = (
    <span className="flex items-center justify-between w-full min-w-0 gap-2">
      <span className="flex items-center min-w-0 gap-2.5">
        <Icon className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
        <span className="truncate font-medium text-text-primary text-[13px]">{currentLabel}</span>
        {workspaces.length > 0 && <span className="bg-count shrink-0">{workspaces.length}</span>}
      </span>
      <ChevronsUpDown className="w-3.5 h-3.5 text-text-muted shrink-0 ml-auto" aria-hidden="true" />
    </span>
  );

  const triggerClassName = bx(
    "bg-btn bg-btn-secondary w-full !justify-between px-3 h-10 rounded-lg text-left font-medium border border-border-default/80 hover:bg-surface-hover hover:border-border-strong text-text-primary transition-all shadow-xs",
    className
  );

  if (!onSelect) {
    return (
      <button type="button" aria-haspopup="true" aria-label={triggerLabel} className={triggerClassName}>
        {triggerContent}
      </button>
    );
  }

  return (
    <Menu
      trigger={triggerContent}
      triggerLabel={triggerLabel}
      triggerClassName={triggerClassName}
      containerClassName="w-full"
      items={items}
    />
  );
}
