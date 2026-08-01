import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell } from './FieldShell';

export function MultipleChoiceRenderer({ field, control, error, disabled }: FieldRendererProps) {
  const options = field.type === 'multiple_choice' ? field.options : [];

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} asGroup>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: controllerField }) => (
          <div role="group" aria-labelledby={`${field.fieldId}-label`} className="flex flex-col gap-2">
            {options.map((opt) => (
              <label
                key={opt}
                className={cn(
                  'flex items-center gap-2 min-h-[44px] text-[13px] text-neutral-800',
                  disabled && 'opacity-60 cursor-not-allowed pointer-events-none'
                )}
              >
                <input
                  type="radio"
                  name={field.fieldId}
                  value={opt}
                  checked={controllerField.value === opt}
                  onChange={() => controllerField.onChange(opt)}
                  onBlur={controllerField.onBlur}
                  disabled={disabled}
                  className="w-4 h-4 accent-brand-600"
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      />
    </FieldShell>
  );
}
