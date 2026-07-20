import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: "draft" | "closed" | "published" | "active" | "new" | "in_progress" | "completed";
  children: string;
}

export function Badge({ variant, children, className, ...props }: BadgeProps) {
  // Safe string conversion and truncation
  const text = typeof children === "string" ? children : "";
  const truncatedText = text.length > 30 ? text.slice(0, 30) + "..." : text;

  const badgeStyles = {
    draft: "bg-neutral-50 border-slate-300 text-neutral-600",
    closed: "bg-rose-50 border-rose-200 text-rose-800",
    published: "bg-brand-50 border-blue-300 text-blue-800",
    active: "bg-emerald-50 border-emerald-300 text-emerald-800",
    new: "bg-indigo-50 border-indigo-300 text-indigo-800",
    in_progress: "bg-amber-50 border-amber-300 text-amber-800",
    completed: "bg-teal-50 border-teal-300 text-teal-800",
  };

  const dotStyles = {
    draft: "bg-neutral-600",
    closed: "bg-rose-800",
    published: "bg-blue-800",
    active: "bg-emerald-800",
    new: "bg-indigo-800",
    in_progress: "bg-amber-800",
    completed: "bg-teal-800",
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
