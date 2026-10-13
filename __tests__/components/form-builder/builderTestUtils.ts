import type { FormField, FieldType } from '@/types/form';

let n = 0;

/** A minimal valid field of any type. */
export function makeField(type: FieldType, over: Partial<FormField> = {}): FormField {
  n += 1;
  const base = {
    fieldId: `fld-${n}`,
    pageId: 'page-1',
    type,
    label: `Field ${n}`,
    required: false,
    deleted: false,
    order: n,
  };
  const extra = type === 'dropdown' || type === 'multiple_choice' || type === 'checkbox' ? { options: ['One', 'Two'] } : {};
  return { ...base, ...extra, ...over } as FormField;
}
