import React from "react";
import { bx } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "default" | "large";
  label?: string;
}

// beginso-ui.css §15 ("Spinner" — .bg-spinner / .bg-spinner-lg).
export function Spinner({ size = "default", label = "Loading", className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={bx("bg-spinner", size === "large" && "bg-spinner-lg", className)}
      {...props}
    />
  );
}
