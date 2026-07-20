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
    draft: "bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]",
    closed: "bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]",
    published: "bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF]",
    active: "bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]",
    new: "bg-[#EEF2FF] border-[#A5B4FC] text-[#3730A3]",
    in_progress: "bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]",
    completed: "bg-[#F0FDFA] border-[#5EEAD4] text-[#115E59]",
  };

  const dotStyles = {
    draft: "bg-[#475569]",
    closed: "bg-[#9F1239]",
    published: "bg-[#1E40AF]",
    active: "bg-[#065F46]",
    new: "bg-[#3730A3]",
    in_progress: "bg-[#92400E]",
    completed: "bg-[#115E59]",
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
