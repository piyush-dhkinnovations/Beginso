import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: "active" | "new" | "in_progress" | "completed" | "draft" | "closed" | "published";
  children: string;
}

export function Badge({ variant, children, className, ...props }: BadgeProps) {
  // Truncate at 30 characters
  const truncatedText = children.length > 30 ? children.slice(0, 30) + "..." : children;

  const badgeStyles = {
    active: "bg-[#F0FDF4] border-[#86EFAC] text-[#065F46]",
    new: "bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF]",
    in_progress: "bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]",
    completed: "bg-[#F0FDF4] border-[#86EFAC] text-[#065F46]",
    draft: "bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]",
    closed: "bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]",
    published: "bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF]",
  };

  const dotStyles = {
    active: "bg-[#065F46]",
    new: "bg-[#1E40AF]",
    in_progress: "bg-[#92400E]",
    completed: "bg-[#065F46]",
    draft: "bg-[#475569]",
    closed: "bg-[#9F1239]",
    published: "bg-[#1E40AF]",
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
