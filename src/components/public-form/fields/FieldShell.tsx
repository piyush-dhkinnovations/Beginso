import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { FieldError } from 'react-hook-form';

/** Base input classes shared by every text-like field renderer — mirrors src/components/ui/Input.tsx. */
export const FIELD_INPUT_CLASSES =
  'w-full min-h-[44px] rounded-md px-3 text-[13px] bg-white transition-colors duration-200 outline-none border-2 border-neutral-200 focus:border-neutral-500';

export const FIELD_INPUT_ERROR_CLASSES = 'border-error focus:border-error';
export const FIELD_INPUT_DISABLED_CLASSES = 'bg-neutral-100 opacity-60 cursor-not-allowed pointer-events-none';

interface FieldShellProps {
  fieldId: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: FieldError;
  /** Compact layout's label-left row style — label beside the input instead of above it. */
  inline?: boolean;
  /**
   * Radio/checkbox groups don't have one focusable input `fieldId` can target — the
   * child is a `role="group"` container, not a labelable element. When true, the
   * label renders as a plain `<span id={`${fieldId}-label`}>` instead of a
   * `<label htmlFor>`; the group container should reference it via aria-labelledby.
   */
  asGroup?: boolean;
  children: ReactNode;
}

/** Shared label/helpText/error chrome around every field renderer's input (Requirement 4, shared rules 1–4). */
export function FieldShell({ fieldId, label, required, helpText, error, inline, asGroup, children }: FieldShellProps) {
  const labelClassName = inline
    ? 'text-body-sm font-semibold text-neutral-800 pt-2.5 shrink-0 w-28'
    : 'text-heading-3 text-neutral-800';
  const labelEl = asGroup ? (
    <span id={`${fieldId}-label`} className={labelClassName}>
      {label}
      {required && <span className="text-error"> *</span>}
    </span>
  ) : (
    <label htmlFor={fieldId} className={labelClassName}>
      {label}
      {required && <span className="text-error"> *</span>}
    </label>
  );

  const rest = (
    <>
      {children}
      {helpText && <p className="text-body-sm text-neutral-400">{helpText}</p>}
      {error && (
        <p role="alert" className="text-caption text-error font-semibold flex items-center gap-1">
          <AlertCircle size={10} className="shrink-0" />
          {error.message}
        </p>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex items-start gap-3 w-full">
        {labelEl}
        <div className="flex flex-col gap-1 flex-1 min-w-0">{rest}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {labelEl}
      {rest}
    </div>
  );
}

/** Live `{current}/{max}` counter shared by ShortText and LongText (Requirements 4.8, 4.10). */
export function CharCounter({ current, max }: { current: number; max: number }) {
  return (
    <p className={`text-caption ${current >= max ? 'text-error' : 'text-neutral-400'}`}>
      {current}/{max}
    </p>
  );
}
