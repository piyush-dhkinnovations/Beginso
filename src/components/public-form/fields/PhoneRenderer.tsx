'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { COUNTRY_CODES, DEFAULT_COUNTRY, joinPhone, splitPhone } from '@/lib/countryCodes';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

/**
 * A country-code selector beside the number. The stored answer is one string, "+<code><digits>"
 * (e.g. "+919876543210"), so it still satisfies a field's own phone pattern.
 */
export function PhoneRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  // The chosen country is kept separately: the digits alone can't say which of two countries sharing a code (+1) was picked.
  const [country, setCountry] = useState<string | null>(null);

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: c }) => {
          const stored = typeof c.value === 'string' ? c.value : '';
          const parsed = splitPhone(stored, country ?? DEFAULT_COUNTRY);
          const active = country ?? parsed.country;
          return (
            <div className="flex w-full gap-2">
              <select
                aria-label="Country code"
                value={active}
                disabled={disabled}
                onChange={(e) => {
                  setCountry(e.target.value);
                  c.onChange(joinPhone(e.target.value, parsed.number));
                }}
                className={cn(FIELD_INPUT_CLASSES, 'w-auto min-w-0 max-w-40 shrink-0 cursor-pointer pr-2', error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
              >
                {COUNTRY_CODES.map(([iso, name, dial]) => (
                  <option key={iso} value={iso}>
                    {name} (+{dial})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                id={field.fieldId}
                placeholder={field.placeholder || '98765 43210'}
                disabled={disabled}
                value={parsed.number}
                onChange={(e) => c.onChange(joinPhone(active, e.target.value))}
                onBlur={c.onBlur}
                className={cn(FIELD_INPUT_CLASSES, 'min-w-0 flex-1', error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
              />
            </div>
          );
        }}
      />
    </FieldShell>
  );
}
