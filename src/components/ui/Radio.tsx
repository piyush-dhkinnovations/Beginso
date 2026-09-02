import React from "react";
import { bx } from "@/lib/utils";

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
  id: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §7 CHOICE CONTROLS. Native
// <input type="radio">, styled via appearance:none — no custom widget.
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ id, label, description, className, ...props }, ref) => {
    const input = (
      <input ref={ref} type="radio" id={id} className={bx("bg-radio", className)} {...props} />
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

Radio.displayName = "Radio";
