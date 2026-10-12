import { cn } from '@/lib/utils';
import { currencyOf, currencySymbol } from '@/lib/fieldDisplay';
import type { FieldRendererProps } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES, FIELD_INPUT_ERROR_CLASSES, FIELD_INPUT_DISABLED_CLASSES } from './FieldShell';

export function CurrencyRenderer({ field, register, error, disabled, inline }: FieldRendererProps) {
  const min = field.type === 'currency' ? field.min : undefined;
  const max = field.type === 'currency' ? field.max : undefined;
  const symbol = currencySymbol(currencyOf(field));

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-body-sm font-semibold text-(--text-muted)">
          {symbol}
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          id={field.fieldId}
          placeholder={field.placeholder || '0.00'}
          min={min}
          max={max}
          disabled={disabled}
          className={cn(FIELD_INPUT_CLASSES, 'pl-8', error && FIELD_INPUT_ERROR_CLASSES, disabled && FIELD_INPUT_DISABLED_CLASSES)}
          {...register(field.fieldId)}
        />
      </div>
    </FieldShell>
  );
}
