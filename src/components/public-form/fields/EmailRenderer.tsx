import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function EmailRenderer({ field, register, trigger, error, disabled }: FieldRendererProps) {
  const { onBlur, ...rest } = register(field.fieldId);

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <input
        type="email"
        id={field.fieldId}
        placeholder={field.placeholder}
        disabled={disabled}
        className={cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
        onBlur={(e) => {
          onBlur(e);
          trigger(field.fieldId);
        }}
        {...rest}
      />
    </FieldShell>
  );
}
