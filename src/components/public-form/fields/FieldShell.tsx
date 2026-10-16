'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { FieldError } from 'react-hook-form';

/** Base input classes shared by every text-like field renderer — mirrors src/components/ui/Input.tsx. */
export const FIELD_INPUT_CLASSES =
  'w-full min-h-10 rounded-lg px-3 bg-body-sm bg-(--surface-card) font-[inherit] max-md:text-base text-[15px] text-(--text-primary) placeholder:text-(--text-muted) transition-colors duration-200 outline-none border border-(--border-default) hover:border-(--border-strong) focus:border-(--action-primary) focus:shadow-(--shadow-focus)';

export const FIELD_INPUT_ERROR_CLASSES = 'border-(--error) focus:border-(--error)';
export const FIELD_INPUT_DISABLED_CLASSES = 'bg-(--bg-sunken) opacity-60 cursor-not-allowed pointer-events-none';

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
  const rootRef = useRef<HTMLDivElement>(null);
  const errorId = `${fieldId}-error`;

  // Tell assistive tech which answer is wrong and why. One place instead of 19 renderers: while the error shows, every
  // native control inside is aria-invalid and described by the message (a radio/checkbox group by its container too).
  // aria-invalid goes only on native controls, where it is valid; the attributes are removed again once the error clears.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const controls = Array.from(root.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea'));
    const groups = Array.from(root.querySelectorAll<HTMLElement>('[role="group"], [role="radiogroup"]'));
    if (error?.message) {
      for (const c of controls) c.setAttribute('aria-invalid', 'true');
      for (const c of [...controls, ...groups]) c.setAttribute('aria-describedby', errorId);
    }
    return () => {
      for (const c of controls) c.removeAttribute('aria-invalid');
      for (const c of [...controls, ...groups]) if (c.getAttribute('aria-describedby') === errorId) c.removeAttribute('aria-describedby');
    };
  }, [error?.message, errorId]);

  const labelClassName = inline
    ? 'bg-body-sm font-semibold text-(--text-primary) pt-2.5 shrink-0 w-28'
    : 'bg-body-sm font-semibold text-(--text-primary)';
  const labelEl = asGroup ? (
    <span id={`${fieldId}-label`} className={labelClassName}>
      {label}
      {required && <span className="text-(--error-text)"> *</span>}
    </span>
  ) : (
    <label htmlFor={fieldId} className={labelClassName}>
      {label}
      {required && <span className="text-(--error-text)"> *</span>}
    </label>
  );

  const rest = (
    <>
      {children}
      {helpText && <p className="bg-body-sm text-(--text-disabled)">{helpText}</p>}
      {error && (
        <p id={errorId} role="alert" className="bg-caption text-(--error-text) font-semibold flex items-center gap-1">
          <AlertCircle size={10} className="shrink-0" />
          {error.message}
        </p>
      )}
    </>
  );

  if (inline) {
    return (
      <div ref={rootRef} data-field-id={fieldId} className="flex items-start gap-3 w-full">
        {labelEl}
        <div className="flex flex-col gap-1 flex-1 min-w-0">{rest}</div>
      </div>
    );
  }

  return (
    <div ref={rootRef} data-field-id={fieldId} className="flex flex-col gap-1.5 w-full">
      {labelEl}
      {rest}
    </div>
  );
}

/** Live `{current}/{max}` counter shared by ShortText and LongText (Requirements 4.8, 4.10). */
export function CharCounter({ current, max }: { current: number; max: number }) {
  return (
    <p className={`bg-caption ${current >= max ? 'text-(--error-text)' : 'text-(--text-disabled)'}`}>
      {current}/{max}
    </p>
  );
}
