import React from "react";
import { Menu } from "lucide-react";
import { bx } from "@/lib/utils";

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  brand?: React.ReactNode;
  actions?: React.ReactNode;
  /** Fills the space between the brand and the actions (the builder's form header). */
  center?: React.ReactNode;
  onMenuClick?: () => void;
}

// beginso-ui.css §12 NAVIGATION (.bg-topbar / .bg-brand).
export function TopBar({ brand, actions, center, onMenuClick, className, ...props }: TopBarProps) {
  return (
    <header className={bx("bg-topbar", className)} {...props}>
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className={bx("bg-btn", "bg-btn-ghost", "bg-btn-icon", "min-h-11 min-w-11")}
        >
          <Menu className="bg-icon" />
        </button>
      )}
      {brand && <div className="bg-brand">{brand}</div>}
      <div className="flex min-w-0 flex-1 items-center">{center}</div>
      {actions}
    </header>
  );
}
