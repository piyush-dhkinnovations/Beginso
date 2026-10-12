'use client';

import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { ADDRESS_PARTS } from '@/lib/fieldDisplay';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

const AUTOCOMPLETE = ['street-address', 'address-level2', 'address-level1', 'postal-code'];

/** Stored as four newline-separated lines (street, city, state, ZIP); all four empty = no answer (''). */
export function AddressRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline} asGroup>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: c }) => {
          const parts = ADDRESS_PARTS.map((_, i) => (typeof c.value === 'string' ? c.value.split('\n')[i] ?? '' : ''));
          const update = (index: number, text: string) => {
            const next = parts.map((p, i) => (i === index ? text.replace(/\n/g, ' ') : p));
            c.onChange(next.every((p) => p.trim() === '') ? '' : next.join('\n'));
          };
          return (
            <div id={field.fieldId} role="group" aria-labelledby={`${field.fieldId}-label`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ADDRESS_PARTS.map((part, i) => (
                <input
                  key={part}
                  type="text"
                  aria-label={part}
                  placeholder={part}
                  autoComplete={AUTOCOMPLETE[i]}
                  maxLength={120}
                  value={parts[i]}
                  disabled={disabled}
                  onChange={(e) => update(i, e.target.value)}
                  onBlur={c.onBlur}
                  className={cn(
                    FIELD_INPUT_CLASSES,
                    i === 0 && 'sm:col-span-2',
                    error && FIELD_INPUT_ERROR_CLASSES,
                    disabled && FIELD_INPUT_DISABLED_CLASSES
                  )}
                />
              ))}
            </div>
          );
        }}
      />
    </FieldShell>
  );
}
