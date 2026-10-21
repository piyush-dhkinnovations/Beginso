'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/Input';

// Sprint 13 (D1.1 Mode 2 "tracked", OQ-4 default). A built-in "Your email" input that lives OUTSIDE the
// form's answers — always present, validated with the form's existing email rule, never mixed into answers
// or exports. The respondent is told plainly what it is for and what the email will NOT contain.
export interface EmailStepProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  /** The Verify button, beside the input. */
  verify?: ReactNode;
  /** Replaces the caption under the input (what to do next). */
  note?: ReactNode;
}

export function EmailStep({ value, onChange, error, disabled, verify, note }: EmailStepProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className={verify ? 'flex items-start gap-2' : undefined}>
        <div className={verify ? 'min-w-0 flex-1' : 'w-full'}>
          <Input
            id="respondent-email"
            type="email"
            label="Your email *"
            placeholder="you@example.com"
            autoComplete="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error ?? undefined}
            disabled={disabled}
            aria-required="true"
          />
        </div>
        {verify}
      </div>
      {note ?? (
        <p className="bg-caption text-(--text-muted)">
          We&apos;ll email you a link to view or correct your answers. The email will not contain your answers.
        </p>
      )}
    </div>
  );
}
