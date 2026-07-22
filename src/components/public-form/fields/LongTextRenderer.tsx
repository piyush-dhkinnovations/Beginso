import { useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, CharCounter, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

const MAX_HEIGHT_PX = 300;

function autoExpand(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
}

export function LongTextRenderer({ field, control, register, error, disabled }: FieldRendererProps) {
  const value = useWatch({ control, name: field.fieldId });
  const maxLength = field.type === 'long_text' ? field.maxLength : undefined;
  const { onChange, ...rest } = register(field.fieldId);

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <textarea
        id={field.fieldId}
        placeholder={field.placeholder}
        maxLength={maxLength}
        disabled={disabled}
        rows={3}
        style={{ maxHeight: MAX_HEIGHT_PX, overflowY: 'auto' }}
        className={cn(FIELD_INPUT_CLASSES, 'py-2 resize-none', error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
        onChange={(e) => {
          onChange(e);
          autoExpand(e.target);
        }}
        {...rest}
      />
      {maxLength && <CharCounter current={typeof value === 'string' ? value.length : 0} max={maxLength} />}
    </FieldShell>
  );
}
