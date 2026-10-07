import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function PhoneRenderer({ field, register, error, disabled, inline }: FieldRendererProps) {
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <div className="relative w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-disabled) bg-body-sm pointer-events-none">+</span>
        <input
          type="tel"
          id={field.fieldId}
          placeholder={field.placeholder}
          disabled={disabled}
          className={cn(FIELD_INPUT_CLASSES, 'pl-7', error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
          {...register(field.fieldId)}
        />
      </div>
    </FieldShell>
  );
}
