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
  children: ReactNode;
}

/** Shared label/helpText/error chrome around every field renderer's input (Requirement 4, shared rules 1–4). */
export function FieldShell({ fieldId, label, required, helpText, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={fieldId} className="text-heading-3 text-neutral-800">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {children}
      {helpText && <p className="text-body-sm text-neutral-400">{helpText}</p>}
      {error && (
        <p role="alert" className="text-caption text-error font-semibold flex items-center gap-1">
          <AlertCircle size={10} className="shrink-0" />
          {error.message}
        </p>
      )}
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
