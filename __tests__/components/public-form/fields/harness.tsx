/**
 * Shared test harness for the public-form field renderers: mounts a renderer inside a real
 * react-hook-form instance and prints the live form values into [data-testid="values"] as JSON.
 */
import type { ComponentType } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldError } from 'react-hook-form';
import type { FormField } from '@/types/form';
import type { FieldRendererProps, FieldValue, FileUploadRendererProps } from '@/types/publicForm';

export function makeField(over: Record<string, unknown> = {}): FormField {
  return {
    fieldId: 'f1',
    pageId: 'p1',
    type: 'short_text',
    label: 'My field',
    required: false,
    deleted: false,
    order: 0,
    ...over,
  } as FormField;
}

type Extra = Partial<Omit<FileUploadRendererProps, keyof FieldRendererProps>>;

interface HarnessProps {
  Renderer: ComponentType<FileUploadRendererProps>;
  field: FormField;
  defaultValues?: Record<string, FieldValue>;
  error?: FieldError;
  disabled?: boolean;
  inline?: boolean;
  extra?: Extra;
}

export function Harness({ Renderer, field, defaultValues, error, disabled, inline, extra }: HarnessProps) {
  const methods = useForm<Record<string, FieldValue>>({ defaultValues });
  // eslint-disable-next-line react-hooks/incompatible-library -- test harness needs live values every render
  const values = methods.watch();
  return (
    <>
      <Renderer
        field={field}
        control={methods.control}
        register={methods.register}
        trigger={methods.trigger}
        setValue={methods.setValue}
        error={error}
        disabled={disabled}
        inline={inline}
        {...extra}
      />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </>
  );
}

export const readValues = (el: HTMLElement): Record<string, unknown> => JSON.parse(el.textContent || '{}');
