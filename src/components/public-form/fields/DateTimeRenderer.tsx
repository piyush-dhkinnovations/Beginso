'use client';

import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

/**
 * Two plain inputs side by side (date, then time) instead of the browser's combined date-time picker, whose
 * popup is cramped and inconsistent. Stored as one "YYYY-MM-DDTHH:mm" string; a half-filled pair is kept
 * (e.g. "2026-10-03T") so validation can ask for the missing part instead of silently losing the other.
 */
export function DateTimeRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  const inputClass = cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES);
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: c }) => {
          const [date = '', time = ''] = (typeof c.value === 'string' ? c.value : '').split('T');
          const update = (d: string, t: string) => c.onChange(d || t ? `${d}T${t}` : '');
          return (
            <div role="group" aria-labelledby={`${field.fieldId}-label`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
              <input
                type="date"
                id={field.fieldId}
                aria-label="Date"
                value={date}
                disabled={disabled}
                onChange={(e) => update(e.target.value, time)}
                onBlur={c.onBlur}
                className={inputClass}
              />
              <input
                type="time"
                aria-label="Time"
                value={time}
                disabled={disabled}
                onChange={(e) => update(date, e.target.value)}
                onBlur={c.onBlur}
                className={inputClass}
              />
            </div>
          );
        }}
      />
    </FieldShell>
  );
}
