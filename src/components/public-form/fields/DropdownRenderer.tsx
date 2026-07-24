import { Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function DropdownRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  const options = field.type === 'dropdown' ? field.options : [];

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: controllerField }) => (
          <select
            id={field.fieldId}
            disabled={disabled}
            className={cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
            value={typeof controllerField.value === 'string' ? controllerField.value : ''}
            onChange={controllerField.onChange}
            onBlur={controllerField.onBlur}
            ref={controllerField.ref}
          >
            <option value="" disabled>Select an option</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      />
    </FieldShell>
  );
}
