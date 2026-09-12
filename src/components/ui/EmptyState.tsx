import React from "react";
import { bx } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Single action container, or backward-compatible actions slot */
  actions?: React.ReactNode;
  /** Primary CTA button per wireframe pattern */
  primaryAction?: React.ReactNode;
  /** Secondary CTA button per wireframe pattern */
  secondaryAction?: React.ReactNode;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §13 FEEDBACK ("Empty state"). Generic —
// no sprint-specific content baked in (requirements.md 2.2/12); supports the wireframe pattern of
// two CTAs (primary + secondary) or a single actions slot.
export function EmptyState({
  icon,
  title,
  description,
  actions,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  const renderedActions = actions ?? (
    (primaryAction || secondaryAction) ? (
      <>
        {primaryAction}
        {secondaryAction}
      </>
    ) : null
  );

  return (
    <div className={bx("bg-empty", className)} {...props}>
      {icon && <div className="bg-empty-art">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {renderedActions && <div className="bg-empty-actions">{renderedActions}</div>}
    </div>
  );
}
