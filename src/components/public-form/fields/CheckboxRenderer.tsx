import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell } from './FieldShell';

export function CheckboxRenderer({ field, control, error, disabled }: FieldRendererProps) {
  const options = field.type === 'checkbox' ? field.options : [];

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} asGroup>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: controllerField }) => {
          const selected = Array.isArray(controllerField.value) ? controllerField.value : [];
          return (
            <div role="group" aria-labelledby={`${field.fieldId}-label`} className="flex flex-col gap-2">
              {options.map((opt) => (
                <label
                  key={opt}
                  className={cn(
                    'flex items-center gap-2 min-h-11 bg-body-sm text-(--text-primary)',
                    disabled && 'opacity-60 cursor-not-allowed pointer-events-none'
                  )}
                >
                  <input
                    type="checkbox"
                    value={opt}
                    checked={selected.includes(opt)}
                    onChange={(e) =>
                      controllerField.onChange(
                        e.target.checked ? [...selected, opt] : selected.filter((v) => v !== opt)
                      )
                    }
                    onBlur={controllerField.onBlur}
                    disabled={disabled}
                    className="w-4 h-4 accent-(--action-primary)"
                  />
                  {opt}
                </label>
              ))}
            </div>
          );
        }}
      />
    </FieldShell>
  );
}
