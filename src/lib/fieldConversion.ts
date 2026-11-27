import type { FieldType, FormField, LogicRule } from '@/types/form';

// A question can be switched to any other type, as in Google Forms. What the two types share is carried over, and a
// setting the new type has no use for is remembered, so switching back restores it.

const OWN_KEYS: Record<FieldType, string[]> = {
  short_text: ['placeholder', 'minLength', 'maxLength', 'pattern'],
  long_text: ['placeholder', 'minLength', 'maxLength', 'pattern'],
  email: ['placeholder'],
  phone: ['placeholder'],
  number: ['placeholder', 'min', 'max'],
  currency: ['placeholder', 'min', 'max', 'currency'],
  date: ['placeholder', 'minDate', 'maxDate'],
  url: ['placeholder', 'urlPreviewStyle', 'urlDisplay', 'urlPreviewPosition', 'urlAspectRatio', 'urlPreviewSize'],
  dropdown: ['options'],
  multiple_choice: ['options'],
  checkbox: ['options'],
  yes_no: ['yesLabel', 'noLabel'],
  file_upload: ['maxFileSize', 'allowedMimeTypes'],
  image_upload: ['maxFileSize', 'allowMultiple', 'maxImages', 'previewPosition', 'aspectRatio', 'previewSize'],
  rating: [],
  time: [],
  datetime: [],
  address: [],
  signature: [],
};

const BASE_KEYS = ['fieldId', 'pageId', 'label', 'required', 'helpText', 'deleted', 'order', 'logicRules'];
const CHOICE_TYPES: FieldType[] = ['dropdown', 'multiple_choice', 'checkbox'];

/**
 * The settings a new question of this type starts with. Display & preview settings are stored explicitly, so a later
 * change to the defaults can never silently re-render responses to a form that was built before it.
 */
export function typeDefaults(type: FieldType): Record<string, unknown> {
  if (CHOICE_TYPES.includes(type)) return { options: ['Option 1'] };
  if (type === 'image_upload') return { allowMultiple: false, previewPosition: 'top', aspectRatio: 'original', previewSize: 'large' };
  if (type === 'url') return { urlPreviewStyle: 'rich', urlDisplay: 'card', urlPreviewPosition: 'top', urlAspectRatio: 'original', urlPreviewSize: 'medium' };
  if (type === 'currency') return { currency: 'INR' };
  return {};
}

/** Every type-specific setting a question has had, so far. */
export type FieldMemory = Record<string, unknown>;

/** `memory` brought up to date with the settings the field has now. A setting the owner cleared is cleared here too. */
export function rememberSettings(field: FormField, memory: FieldMemory = {}): FieldMemory {
  const next = { ...memory };
  for (const key of OWN_KEYS[field.type]) next[key] = (field as unknown as FieldMemory)[key];
  return next;
}

/** The same question as another type: same id, label, help text, required switch and position. */
export function convertField(field: FormField, to: FieldType, labelFor: (t: FieldType) => string, memory?: FieldMemory): FormField {
  const source = field as unknown as FieldMemory;
  const settings = rememberSettings(field, memory);
  const next: FieldMemory = { type: to, placeholder: '', ...typeDefaults(to) };
  for (const key of BASE_KEYS) if (source[key] !== undefined) next[key] = source[key];
  // Choices need at least one option (the server refuses none). A Yes / No question brings its two answers.
  const options = settings.options as string[] | undefined;
  if (!options?.some((o) => o.trim())) settings.options = field.type === 'yes_no' ? ['Yes', 'No'] : undefined;
  for (const key of OWN_KEYS[to]) if (settings[key] !== undefined) next[key] = settings[key];
  // A label nobody changed ("Dropdown") follows the new type; a label the owner wrote is left alone.
  if (field.label === labelFor(field.type)) next.label = labelFor(to);
  return next as unknown as FormField;
}

const PATTERNS: Partial<Record<FieldType, RegExp>> = {
  rating: /^[1-5]$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}$/,
  datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
};

/** Could an answer to `source` ever equal `value`? A rule that never can would leave its target hidden (or shown) for good. */
export function ruleCanMatch(source: FormField, { condition }: LogicRule): boolean {
  const { value } = condition;
  switch (source.type) {
    case 'file_upload':
    case 'image_upload':
    case 'signature':
      return false;
    case 'dropdown':
    case 'multiple_choice':
    case 'checkbox':
      return source.options.includes(value);
    case 'yes_no':
      return value === 'Yes' || value === 'No';
    case 'number':
    case 'currency':
      return value.trim() !== '' && Number.isFinite(Number(value));
    default:
      return PATTERNS[source.type]?.test(value) ?? true;
  }
}
