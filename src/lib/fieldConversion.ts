import type { FieldType, FormField } from '@/types/form';

// Types a field can be switched between without losing what the owner typed. Only types that share the same
// kind of answer are grouped: a Dropdown can become Multiple choice or Checkbox (the options carry over), a Short
// text can become Long text, and so on. Anything else (file, rating, signature…) is rebuilt as a new field.
const GROUPS: FieldType[][] = [
  ['dropdown', 'multiple_choice', 'checkbox'],
  ['short_text', 'long_text', 'email', 'phone'],
  ['number', 'currency'],
];

export const convertibleTypes = (type: FieldType): FieldType[] => (GROUPS.find((g) => g.includes(type)) ?? []).filter((t) => t !== type);

const BASE_KEYS = ['fieldId', 'pageId', 'label', 'placeholder', 'required', 'helpText', 'deleted', 'order', 'logicRules'];

/** The same field as another type: shared properties stay, settings of the old type that mean nothing to the new one go. */
export function convertField(field: FormField, to: FieldType, labelFor: (t: FieldType) => string): FormField {
  const src = field as unknown as Record<string, unknown>;
  const keep = [...BASE_KEYS];
  if (['dropdown', 'multiple_choice', 'checkbox'].includes(to)) keep.push('options');
  if (['short_text', 'long_text'].includes(to)) keep.push('minLength', 'maxLength');
  if (['number', 'currency'].includes(to)) keep.push('min', 'max');
  const next: Record<string, unknown> = { type: to };
  for (const k of keep) if (k in src && src[k] !== undefined) next[k] = src[k];
  if (to === 'currency') next.currency = 'INR';
  // A label nobody changed ("Dropdown") follows the new type; a label the owner wrote is left alone.
  if (field.label === labelFor(field.type)) next.label = labelFor(to);
  return next as unknown as FormField;
}
