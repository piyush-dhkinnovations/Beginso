import React from "react";
import { bx } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  id: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §6 FORM FIELDS. .bg-select supplies its
// own dropdown-arrow background-image; dark mode swaps that image via [data-theme="dark"] .bg-select
// (already handled globally, nothing to do here).
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    return (
      <div className="bg-field">
        {label && (
          <label htmlFor={id} className="bg-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={bx("bg-select", error && "is-error", className)}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={`${id}-error`} role="alert" className="bg-error-text bg-body-sm flex items-center gap-1">
            <AlertCircle size={14} className="bg-icon" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
