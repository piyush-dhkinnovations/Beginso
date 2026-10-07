import React from "react";
import { bx } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightSlot?: React.ReactNode;
  /** Decorative icon inside the left edge (e.g. a search glass). */
  leftIcon?: React.ReactNode;
  id: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §6 FORM FIELDS.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, disabled, type = "text", id, rightSlot, leftIcon, style, ...props }, ref) => {
    return (
      <div className="bg-field">
        {label && (
          <label htmlFor={id} className="bg-label">
            {label}
          </label>
        )}
        {/* Always the same wrapper, whether or not rightSlot is present — rightSlot is often
            conditional on the input's own value (e.g. a clear button that only shows once
            there's text), and swapping the input's DOM ancestry between renders (bare
            <input> vs <div><input/></div>) remounts it mid-typing. Reproduced as a real bug:
            ResponsesToolbar's debounced search only ever saw the first typed character. */}
        <div className={bx("bg-input-wrap", rightSlot && "has-trail")}>
          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={bx("bg-input", error && "is-error", className)}
            // beginso-ui.css's ".bg-input-wrap .bg-input" rule always reserves 40px of left
            // padding for a *leading* icon (.bg-input-lead) this component doesn't have —
            // reset back to .bg-input's own default. An inline style is the only thing
            // guaranteed to win over that rule's specificity.
            style={{ paddingLeft: leftIcon ? "var(--space-10)" : "var(--space-3)", ...style }}
            {...props}
          />
          {leftIcon && (
            <span className="bg-input-lead" aria-hidden="true">{leftIcon}</span>
          )}
          {rightSlot && (
            // "is-action" restores pointer-events on the trailing slot — the base
            // .bg-input-trail rule sets pointer-events: none, since most trailing
            // content is a decorative icon, not the interactive controls (e.g. a
            // password-visibility toggle) every current call site actually passes.
            <span className="bg-input-trail is-action">{rightSlot}</span>
          )}
        </div>
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

Input.displayName = "Input";
