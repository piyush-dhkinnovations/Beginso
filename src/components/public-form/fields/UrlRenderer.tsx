import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function UrlRenderer({ field, register, error, disabled, inline }: FieldRendererProps) {
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <input
        type="text"
        inputMode="url"
        autoComplete="url"
        id={field.fieldId}
        placeholder={field.placeholder || 'https://example.com'}
        maxLength={2048}
        disabled={disabled}
        className={cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
        {...register(field.fieldId)}
      />
    </FieldShell>
  );
}
