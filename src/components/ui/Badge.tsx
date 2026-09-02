import React from "react";
import { bx } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "success" | "warning" | "error" | "info" | "outline";
  pill?: boolean;
  size?: "default" | "lg";
  dot?: boolean;
}

// Generic beginso-ui.css badge primitive — see src/styles/beginso-ui.css §8 BADGES, PILLS, TAGS.
// Distinct from StatusBadge (src/components/ui/StatusBadge.tsx), which is V1's form/response
// status chip and uses an unrelated variant set.
const variantClass: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "",
  primary: "bg-badge-primary",
  success: "bg-badge-success",
  warning: "bg-badge-warning",
  error: "bg-badge-error",
  info: "bg-badge-info",
  outline: "bg-badge-outline",
};

export function Badge({
  variant = "neutral",
  pill,
  size = "default",
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={bx(
        "bg-badge",
        variantClass[variant],
        pill && "bg-badge-pill",
        size === "lg" && "bg-badge-lg",
        className
      )}
      {...props}
    >
      {dot && <span className="bg-badge-dot" />}
      {children}
    </span>
  );
}
