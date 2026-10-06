import type { FormField } from '@/types/form';
import type { FieldValue } from '@/types/publicForm';

// Fields a link may pre-fill. Files can never be pre-filled; there is no password/hidden field type, and
// anything not listed here is ignored if one is added later.
const PREFILLABLE = new Set<FormField['type']>(['short_text', 'long_text', 'email', 'phone', 'number', 'date', 'dropdown', 'multiple_choice', 'checkbox']);

/** Match a prefill key against a field id first, then its label (trimmed, case-insensitive). */
export function matchPrefillField(fields: FormField[], key: string): FormField | undefined {
  const k = key.trim();
  if (!k) return undefined;
  const live = fields.filter((f) => !f.deleted && PREFILLABLE.has(f.type));
  return live.find((f) => f.fieldId === k) ?? live.find((f) => f.label.trim().toLowerCase() === k.toLowerCase());
}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** One validated value for a field, or undefined when it does not fit (the entry is then ignored). */
export function coercePrefill(field: FormField, raw: string): FieldValue | undefined {
  const v = raw.replace(CONTROL, '').trim();
  if (!v) return undefined;
  switch (field.type) {
    case 'short_text':
    case 'phone':
      return v.slice(0, 500);
    case 'long_text':
      return v.slice(0, 2000);
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.slice(0, 254) : undefined;
    case 'number': {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
    case 'dropdown':
    case 'multiple_choice':
      return field.options.includes(v) ? v : undefined;
    case 'checkbox': {
      const picked = v.split(',').map((s) => s.trim()).filter((s) => field.options.includes(s));
      return picked.length ? [...new Set(picked)] : undefined;
    }
    default:
      return undefined;
  }
}

/** fieldId -> value for every prefill entry that names a real, prefillable field and holds a valid value. */
export function resolvePrefill(fields: FormField[], entries: Record<string, string>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const [key, raw] of Object.entries(entries)) {
    const field = matchPrefillField(fields, key);
    if (!field) continue;
    const value = coercePrefill(field, raw);
    if (value !== undefined) out[field.fieldId] = value;
  }
  return out;
}

export interface PrefillCheck {
  fieldLabel?: string;
  /** Why the row would be ignored by the form, or undefined when it will fill a field. */
  error?: string;
}

/** Per-row verdict, so the builder can flag (and leave out of the snippet) a row the form would ignore. */
export function checkPrefillRow(fields: FormField[], key: string, value: string): PrefillCheck {
  if (!key.trim()) return {};
  const field = matchPrefillField(fields, key);
  if (!field) return { error: 'No field of this form has that id or label (file uploads cannot be pre-filled).' };
  if (!value.trim()) return { fieldLabel: field.label };
  if (coercePrefill(field, value) === undefined) {
    const hint = field.type === 'dropdown' || field.type === 'multiple_choice' || field.type === 'checkbox' ? "Use one of the field's options exactly." : field.type === 'date' ? 'Use YYYY-MM-DD.' : field.type === 'number' ? 'Use a number.' : field.type === 'email' ? 'Use a valid email address.' : 'This value is not accepted.';
    return { fieldLabel: field.label, error: hint };
  }
  return { fieldLabel: field.label };
}
