import { LogoImage } from "./LogoImage";
import { ChevronsUpDown, User, Building2 } from "lucide-react";
import { bx } from "@/lib/utils";
import { Menu } from "./Menu";
import type { MenuItem } from "./Menu";
import { Badge } from "./Badge";
import { roleLabel } from "@/lib/roles";

export interface ContextSwitcherWorkspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
  memberCount?: number;
  /** The workspace's logo (an uploaded image URL); absent = the BeginSo mark. */
  logo?: string | null;
}

export type ContextSwitcherTarget =
  | { type: "personal" }
  | { type: "workspace"; workspace: ContextSwitcherWorkspace };

export interface ContextSwitcherProps {
  currentLabel?: string;
  /** Second line under the current name, e.g. "Owner · 3 members" or "Only you". */
  currentMeta?: string;
  workspaces?: ContextSwitcherWorkspace[];
  /** When omitted, renders Sprint 7's original inert trigger (no dropdown) — preserves the
   * existing "safe with no props" behavior for any caller not yet ready to wire real data. */
  onSelect?: (target: ContextSwitcherTarget) => void;
  /** Called when the user clicks "View all workspaces" at the bottom of the dropdown. */
  onViewAll?: () => void;
  /** Logo of the current workspace, shown in place of the icon. */
  currentLogo?: string | null;
  className?: string;
  collapsed?: boolean;
}

// The icon slot: the workspace's own logo when it has one, otherwise the BeginSo mark (workspace) or the person glyph (Personal).
function ContextAvatar({ logo, Icon, size }: { logo?: string | null; Icon: typeof User; size: "sm" | "lg" }) {
  // A workspace with its own logo shows the logo alone (no box, border or background around it); the glyph keeps its quiet tile.
  if (logo) {
    return <LogoImage key={logo} src={logo} size={size === "lg" ? 40 : 24} />;
  }
  // A workspace that chose "BeginSo default" (no logo) shows the BeginSo mark, not a generic building; Personal keeps the person glyph.
  if (Icon === Building2) {
    return (
      <span aria-hidden="true" className={bx("flex shrink-0 items-center justify-center overflow-hidden border border-(--border-default) bg-(--surface-card)", size === "lg" ? "size-10 rounded-md" : "size-6 rounded")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local brand mark */}
        <img src="/favicon.svg" alt="" className={size === "lg" ? "size-6" : "size-4"} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={bx("flex shrink-0 items-center justify-center overflow-hidden border border-(--border-default) bg-(--bg-subtle)", size === "lg" ? "size-10 rounded-md" : "size-6 rounded")}>
      <Icon className={size === "lg" ? "w-5 h-5 text-(--text-muted)" : "w-3.5 h-3.5 text-(--text-muted)"} />
    </span>
  );
}

// Sprint 7 built this as an inert shell — a static trigger with no dropdown wired to real data.
// Sprint 8 Day 2 adds the real switching logic: reuses ui/Menu wholesale (not just its CSS
// classes) for keyboard nav (arrow keys, Enter, Escape), outside-click-close, and
// focus-restore-to-trigger, rather than reimplementing all three a second time
// (requirements.md §7.2, §11) — Menu already does exactly this for row-action menus.
export function ContextSwitcher({
  currentLabel = "Personal",
  currentMeta,
  workspaces = [],
  onSelect,
  onViewAll,
  currentLogo,
  className,
  collapsed = false,
}: ContextSwitcherProps) {
  const triggerLabel = `Switch context, currently ${currentLabel}${currentMeta ? `, ${currentMeta}` : ''}`;
  const isPersonal = currentLabel.toLowerCase() === "personal";
  const Icon = isPersonal ? User : Building2;

  const items: MenuItem[] = onSelect
    ? [
        {
          id: "personal",
          label: (
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <ContextAvatar Icon={User} size="sm" />
                <span className="truncate font-medium">Personal</span>
              </span>
              <span className="bg-caption text-(--text-muted) shrink-0">Only you</span>
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
                  <ContextAvatar logo={workspace.logo} Icon={Building2} size="sm" />
                  <span className="truncate font-medium">{workspace.name}</span>
                </span>
                {workspace.role && <Badge>{roleLabel(workspace.role)}</Badge>}
              </span>
            ),
            onSelect: () => onSelect({ type: "workspace", workspace }),
          })
        ),
      ]
    : [];

  const viewAllFooter = onViewAll ? (
    <button
      type="button"
      onClick={onViewAll}
      className="w-full px-3 py-2 text-left bg-caption font-medium text-(--text-link) hover:text-(--text-primary) hover:bg-(--surface-hover) transition-colors"
    >
      View all workspaces
    </button>
  ) : undefined;

  if (collapsed) {
    const compactContent = (
      <span className="flex items-center justify-center w-full h-full" title={triggerLabel}>
        <ContextAvatar logo={currentLogo} Icon={Icon} size="lg" />
      </span>
    );
    const compactTriggerClassName = bx(
      "bg-btn bg-btn-secondary w-12 h-12 p-0 !justify-center rounded-xl shadow-xs hover:bg-(--surface-hover) hover:border-(--border-strong)",
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
        footer={viewAllFooter}
      />
    );
  }

  const triggerContent = (
    <span className="flex items-center justify-between w-full min-w-0 gap-2">
      <span className="flex items-center min-w-0 gap-3">
        <ContextAvatar logo={currentLogo} Icon={Icon} size="lg" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-semibold text-(--text-primary) bg-body-sm">{currentLabel}</span>
          {currentMeta && <span className="truncate bg-caption font-normal text-(--text-muted)">{currentMeta}</span>}
        </span>
      </span>
      <ChevronsUpDown className="w-3.5 h-3.5 text-(--text-muted) shrink-0 ml-auto" aria-hidden="true" />
    </span>
  );

  const triggerClassName = bx(
    "bg-btn bg-btn-secondary w-full !justify-between px-3 py-2 min-h-14 rounded-xl text-left font-medium border border-(--border-default)/80 hover:bg-(--surface-hover) hover:border-(--border-strong) text-(--text-primary) transition-all shadow-xs",
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
      footer={viewAllFooter}
    />
  );
}
