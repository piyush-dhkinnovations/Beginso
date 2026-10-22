"use client";

import React, { useEffect, useId, useRef } from "react";
import { bx } from "@/lib/utils";

export interface CodeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once, when the last box is filled (typing, paste or autofill). */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Shown under the boxes; also paints them red. */
  error?: string | null;
  autoFocus?: boolean;
  className?: string;
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

/**
 * A one-time code as separate boxes (6 by default): type and it moves on, Backspace steps back, the arrow keys move between boxes, and a
 * paste or an autofill from a text message spreads the whole code across them. Digits only. The first box asks the phone for the code
 * (autocomplete="one-time-code"). The boxes are one group with one label for a screen reader.
 */
export function CodeInput({ label, value, onChange, onComplete, length = 6, disabled, error, autoFocus, className }: CodeInputProps) {
  const labelId = useId();
  const errorId = useId();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // autoFocus: the first box has the cursor when the code starts, and again whenever it is emptied (a wrong code clears it).
  useEffect(() => {
    if (autoFocus && value === "" && !disabled) boxes.current[0]?.focus();
  }, [autoFocus, value, disabled]);

  const focusBox = (i: number) => {
    const box = boxes.current[Math.max(0, Math.min(length - 1, i))];
    box?.focus();
    box?.select();
  };

  const commit = (next: string, focusAt: number) => {
    onChange(next);
    if (next.length === length) {
      if (next !== value) onComplete?.(next);
    } else {
      focusBox(focusAt);
    }
  };

  const onBoxChange = (i: number, raw: string) => {
    const typed = digitsOf(raw);
    if (typed.length === 0) {
      // the box was emptied some other way than Backspace (cut, select-all delete)
      commit(value.slice(0, i) + value.slice(i + 1), i);
      return;
    }
    // One digit replaces the one in this box; several (autofill, a paste into the field) fill from here on.
    const next = typed.length === 1 ? (value.slice(0, i) + typed + value.slice(i + 1)).slice(0, length) : (value.slice(0, i) + typed).slice(0, length);
    commit(next, Math.min(i + typed.length, length - 1));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) commit(value.slice(0, i) + value.slice(i + 1), i);
      else if (i > 0) commit(value.slice(0, i - 1) + value.slice(i), i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const onPaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = digitsOf(e.clipboardData.getData("text"));
    if (!pasted) return;
    // A whole code replaces everything, wherever it was pasted; a part goes in from the box it was pasted into.
    const next = pasted.length >= length ? pasted.slice(0, length) : (value.slice(0, i) + pasted).slice(0, length);
    commit(next, Math.min(next.length, length - 1));
  };

  return (
    <div className={bx("flex flex-col gap-1.5", className)}>
      <span id={labelId} className="bg-label">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} aria-describedby={error ? errorId : undefined} className="flex justify-between gap-2">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            value={value[i] ?? ""}
            disabled={disabled}
            onChange={(e) => onBoxChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            className={bx(
              "h-12 min-w-0 flex-1 rounded-lg border bg-(--surface-card) text-center text-xl font-semibold text-(--text-primary) outline-none transition-colors duration-200 max-w-12",
              "hover:border-(--border-strong) focus:border-(--action-primary) focus:shadow-(--shadow-focus) disabled:opacity-60",
              error ? "border-(--error)" : "border-(--border-default)"
            )}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="bg-body-sm text-(--error-text)">
          {error}
        </p>
      )}
    </div>
  );
}
