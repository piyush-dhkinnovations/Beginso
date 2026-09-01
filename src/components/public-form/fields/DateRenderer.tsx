import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function DateRenderer({ field, register, error, disabled, inline }: FieldRendererProps) {
  const minDate = field.type === 'date' ? field.minDate : undefined;
  const maxDate = field.type === 'date' ? field.maxDate : undefined;

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <input
        type="date"
        id={field.fieldId}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        className={cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
        {...register(field.fieldId)}
      />
    </FieldShell>
  );
}
