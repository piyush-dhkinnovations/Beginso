import React from "react";
import { bx } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
  id: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §7 CHOICE CONTROLS. Native
// <input type="checkbox">, styled via appearance:none — no custom widget.
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, label, description, className, ...props }, ref) => {
    const input = (
      <input ref={ref} type="checkbox" id={id} className={bx("bg-checkbox", className)} {...props} />
    );

    if (!label) return input;

    return (
      <label htmlFor={id} className="bg-choice">
        {input}
        <span className="bg-choice-text">
          {label}
          {description && <small>{description}</small>}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
