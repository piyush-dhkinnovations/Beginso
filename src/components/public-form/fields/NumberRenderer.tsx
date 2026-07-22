import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function NumberRenderer({ field, register, error, disabled }: FieldRendererProps) {
  const min = field.type === 'number' ? field.min : undefined;
  const max = field.type === 'number' ? field.max : undefined;

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <input
        type="number"
        id={field.fieldId}
        placeholder={field.placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className={cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
        {...register(field.fieldId)}
      />
    </FieldShell>
  );
}
