import React from "react";
import { bx } from "@/lib/utils";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: "draft" | "closed" | "published" | "active" | "new" | "in_progress" | "completed" | "neutral";
  children: string;
}

// Status chip for forms/responses, built on the beginso-ui.css `.bg-badge` primitive (§8) so it
// follows every theme. "published" and "completed" share the "active" (success) treatment.
// "neutral" is for non-status chips (e.g. a template's category) that just need the pill shape.
const variantClass: Record<StatusBadgeProps["variant"], string> = {
  draft: "bg-badge-outline",
  closed: "bg-badge-error",
  published: "bg-badge-success",
  active: "bg-badge-success",
  completed: "bg-badge-success",
  new: "bg-badge-info",
  in_progress: "bg-badge-warning",
  neutral: "bg-badge-outline",
};

export function StatusBadge({ variant, children, className, ...props }: StatusBadgeProps) {
  const text = typeof children === "string" ? children : "";
  const truncatedText = text.length > 30 ? text.slice(0, 30) + "..." : text;

  return (
    <span className={bx("bg-badge bg-badge-pill whitespace-nowrap", variantClass[variant], className)} {...props}>
      <span className="bg-badge-dot" />
      {truncatedText}
    </span>
  );
}
