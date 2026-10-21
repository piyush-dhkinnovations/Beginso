import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export interface EmailRendererProps extends FieldRendererProps {
  /** Mode 2 (tracked): the Verify button, shown at the right of the input. */
  verify?: ReactNode;
  /** The line under the input that says what to do next. */
  verifyNote?: ReactNode;
}

export function EmailRenderer({ field, register, trigger, error, disabled, inline, verify, verifyNote }: EmailRendererProps) {
  const { onBlur, ...rest } = register(field.fieldId);

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <div className={cn(verify && 'flex items-start gap-2')}>
        <input
          type="email"
          id={field.fieldId}
          placeholder={field.placeholder}
          disabled={disabled}
          className={cn(verify && 'min-w-0 flex-1', FIELD_INPUT_CLASSES, error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
          onBlur={(e) => {
            onBlur(e);
            trigger(field.fieldId);
          }}
          {...rest}
        />
        {verify}
      </div>
      {verifyNote}
    </FieldShell>
  );
}
