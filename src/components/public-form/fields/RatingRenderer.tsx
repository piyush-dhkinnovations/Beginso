'use client';

import { Star } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell } from './FieldShell';

const STARS = [1, 2, 3, 4, 5];

export function RatingRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline} asGroup>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: c }) => {
          const value = Number(c.value) || 0;
          return (
            <div id={field.fieldId} role="radiogroup" aria-labelledby={`${field.fieldId}-label`} className={cn('flex items-center gap-1', disabled && 'opacity-60 pointer-events-none')}>
              {STARS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={value === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  disabled={disabled}
                  // Clicking the chosen star again clears the rating.
                  onClick={() => c.onChange(n === value ? undefined : n)}
                  onBlur={c.onBlur}
                  className="flex min-h-11 min-w-9 items-center justify-center rounded-md text-(--warning-text) hover:bg-(--surface-hover)"
                >
                  <Star size={26} aria-hidden="true" className={n <= value ? 'fill-current' : 'text-(--border-strong)'} />
                </button>
              ))}
              {value > 0 && <span className="ml-2 bg-body-sm text-(--text-muted)">{value} / 5</span>}
            </div>
          );
        }}
      />
    </FieldShell>
  );
}
