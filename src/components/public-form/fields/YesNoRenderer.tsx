'use client';

import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell } from './FieldShell';
import { yesNoWords } from '@/lib/fieldDisplay';

export function YesNoRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  const words = yesNoWords(field);
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline} asGroup>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: c }) => (
          <div id={field.fieldId} role="radiogroup" aria-labelledby={`${field.fieldId}-label`} className="flex gap-2">
            {(['Yes', 'No'] as const).map((option) => {
              const selected = c.value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => c.onChange(option)}
                  onBlur={c.onBlur}
                  className={cn(
                    'min-h-10 min-w-20 rounded-lg border px-4 bg-body-sm font-medium transition-colors',
                    selected
                      ? 'border-(--action-primary) bg-(--accent-soft) text-(--accent-soft-text)'
                      : 'border-(--border-default) bg-(--surface-card) text-(--text-primary) hover:border-(--border-strong)',
                    disabled && 'opacity-60 pointer-events-none'
                  )}
                >
                  {option === 'Yes' ? words.yes : words.no}
                </button>
              );
            })}
          </div>
        )}
      />
    </FieldShell>
  );
}
