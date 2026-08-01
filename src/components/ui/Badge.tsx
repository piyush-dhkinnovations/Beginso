import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: "draft" | "closed" | "published" | "active" | "new" | "in_progress" | "completed" | "neutral";
  children: string;
}

export function Badge({ variant, children, className, ...props }: BadgeProps) {
  // Safe string conversion and truncation
  const text = typeof children === "string" ? children : "";
  const truncatedText = text.length > 30 ? text.slice(0, 30) + "..." : text;

  // Tokens from 04-design-system.md §4.7 — "published" and "completed" intentionally
  // share the "active" (green) treatment; the doc gives them the identical color.
  const badgeStyles = {
    draft: "bg-status-draft-bg border-status-draft-border text-status-draft-text",
    closed: "bg-status-closed-bg border-status-closed-border text-status-closed-text",
    published: "bg-status-active-bg border-status-active-border text-status-active-text",
    active: "bg-status-active-bg border-status-active-border text-status-active-text",
    new: "bg-status-new-bg border-status-new-border text-status-new-text",
    in_progress: "bg-status-progress-bg border-status-progress-border text-status-progress-text",
    completed: "bg-status-active-bg border-status-active-border text-status-active-text",
    // Not a status — for non-status chips (e.g. a template's category) that just need
    // the same pill/border shape without implying draft/active/etc.
    neutral: "bg-neutral-100 border-neutral-300 text-neutral-600",
  };

  const dotStyles = {
    draft: "bg-status-draft-dot",
    closed: "bg-status-closed-dot",
    published: "bg-status-active-dot",
    active: "bg-status-active-dot",
    new: "bg-status-new-dot",
    in_progress: "bg-status-progress-dot",
    completed: "bg-status-active-dot",
    neutral: "bg-neutral-400",
  };

  return (
    <span
      className={cn(
        "wf-badge inline-flex items-center gap-1.5 px-2 py-[3px] border rounded-full text-[11px] font-bold h-auto whitespace-nowrap",
        badgeStyles[variant],
        className
      )}
      {...props}
    >
      <span className={cn("wf-badge-dot w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant])} />
      {truncatedText}
    </span>
  );
}
