import React from "react";
import { bx } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// beginso-ui.css's `.bg-switch` styles a native `<input type="checkbox">` directly — kept in the
// DOM (not a custom <button>/<span> toggle) so keyboard, screen readers and form submission work
// with no extra JS (src/styles/beginso-ui.css §7 CHOICE CONTROLS). `checked`/`onChange(boolean)`
// preserved exactly as every existing call site already uses it.
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ id, checked, onChange, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        id={id}
        checked={checked}
        aria-checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={bx("bg-switch", className)}
        {...props}
      />
    );
  }
);

Switch.displayName = "Switch";
