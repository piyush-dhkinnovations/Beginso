import React from "react";
import { bx } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §13 FEEDBACK ("Empty state"). Generic —
// no sprint-specific content baked in (requirements.md 2.2/12); every later list/table page
// supplies its own icon/title/description/actions.
export function EmptyState({ icon, title, description, actions, className, ...props }: EmptyStateProps) {
  return (
    <div className={bx("bg-empty", className)} {...props}>
      {icon && <div className="bg-empty-art">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actions && <div className="bg-empty-actions">{actions}</div>}
    </div>
  );
}
