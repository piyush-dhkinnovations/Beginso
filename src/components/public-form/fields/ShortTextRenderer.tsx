import { useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, CharCounter, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function ShortTextRenderer({ field, control, register, error, disabled, inline }: FieldRendererProps) {
  const value = useWatch({ control, name: field.fieldId });
  const maxLength = field.type === 'short_text' ? field.maxLength : undefined;

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <input
        type="text"
        id={field.fieldId}
        placeholder={field.placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className={cn(FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
        {...register(field.fieldId)}
      />
      {maxLength && <CharCounter current={typeof value === 'string' ? value.length : 0} max={maxLength} />}
    </FieldShell>
  );
}
