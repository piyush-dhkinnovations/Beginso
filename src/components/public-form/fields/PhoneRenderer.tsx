'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
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
          const dial = COUNTRY_CODES.find(([iso]) => iso === active)?.[2] ?? '';
          return (
            <div className="flex w-full gap-2">
              {/* The select is invisible and sits over a short "+91" label, so the closed control stays narrow and the
                  number gets the room; opening it lists every country by name. */}
              <div className={cn(FIELD_INPUT_CLASSES, 'relative flex w-24 shrink-0 items-center justify-between gap-1 px-3', error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}>
                <span aria-hidden="true" className="font-medium tabular-nums">+{dial}</span>
                <ChevronDown aria-hidden="true" size={14} className="shrink-0 text-(--text-muted)" />
                <select
                  aria-label="Dialling code"
                  value={active}
                  disabled={disabled}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    c.onChange(joinPhone(e.target.value, parsed.number));
                  }}
                  className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                >
                  {COUNTRY_CODES.map(([iso, name, code]) => (
                    <option key={iso} value={iso}>
                      {name} (+{code})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                id={field.fieldId}
                placeholder={(field.placeholder ?? '').replace(/^\+\d+\s*/, '') || '98765 43210'}
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
