import React from "react";
import { bx } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "text" | "title" | "circle" | "block";
  width?: number | string;
  height?: number | string;
}

const VARIANT_CLASS: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "bg-skeleton-text",
  title: "bg-skeleton-title",
  circle: "bg-skeleton-circle",
  block: "",
};

// beginso-ui.css classes — see src/styles/beginso-ui.css §13 FEEDBACK ("Skeleton"). Generic — no
// sprint-specific content (requirements.md 2.2/12); width/height are the only per-use knobs.
export function Skeleton({ variant = "text", width, height, className, style, ...props }: SkeletonProps) {
  return (
    <span
      className={bx("bg-skeleton", VARIANT_CLASS[variant], className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}
