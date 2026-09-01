import React from "react";
import { bx } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  id: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §6 FORM FIELDS.
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="bg-field">
        {label && (
          <label htmlFor={id} className="bg-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={bx("bg-textarea", error && "is-error", className)}
          {...props}
        />
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

Textarea.displayName = "Textarea";
