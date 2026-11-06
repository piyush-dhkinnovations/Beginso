import React from "react";
import { bx } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "error";
  size?: "default" | "small";
  label?: string;
}

// beginso-ui.css §13 FEEDBACK ("Progress").
export function Progress({
  value,
  max = 100,
  variant = "default",
  size = "default",
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const variantClass = variant !== "default" && `bg-progress-${variant}`;

  return (
    <div {...props}>
      {label && (
        <div className="bg-progress-label">
          <span>{label}</span>
          <strong>{Math.round(pct)}%</strong>
        </div>
      )}
      <div
        role="progressbar"
        // the name belongs on the bar itself (a screen reader reads the element with the role), not on the wrapper around it
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={bx("bg-progress", size === "small" && "bg-progress-sm", variantClass, className)}
      >
        <div className="bg-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
