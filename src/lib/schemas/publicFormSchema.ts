import { z } from 'zod';
import type { FormField } from '@/types/form';

/**
 * Builds a Zod schema for a subset of fields (visible fields on the current page,
 * or all visible fields at final submit time). Hidden fields are excluded entirely
 * so they can never trigger a validation error (Requirement 5.5).
 */
export function buildPublicFormSchema(
  fields: FormField[],
  hiddenFieldIds: Set<string>
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (hiddenFieldIds.has(field.fieldId)) continue;

    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'short_text':
      case 'long_text': {
        let s = z.string();
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required ? s.min(1, 'This field is required') : s.optional();
        break;
      }
      case 'email': {
        // "required" must be checked before "email format" — an empty string fails both,
        // and whichever check is chained first wins the reported error message.
        schema = field.required
          ? z.string().min(1, 'This field is required').email('Please enter a valid email address.')
          : z.string().email('Please enter a valid email address.').optional().or(z.literal(''));
        break;
      }
      case 'phone': {
        schema = field.required
          ? z.string().min(1, 'This field is required').regex(/^[\d\s\-+]+$/, 'Please enter a valid phone number.')
          : z.string().regex(/^[\d\s\-+]+$/, 'Please enter a valid phone number.').optional().or(z.literal(''));
        break;
      }
      case 'number': {
        // z.coerce.number() converts '' to 0 (Number('') === 0), so a required field left
        // blank would silently pass as "0" instead of failing — preprocess blank input to
        // undefined first so the required check actually fires.
        let n = field.required
          ? z.coerce.number({ error: 'This field is required' })
          : z.coerce.number();
        if (field.min !== undefined && field.max !== undefined) {
          n = n
            .min(field.min, `Must be between ${field.min} and ${field.max}.`)
            .max(field.max, `Must be between ${field.min} and ${field.max}.`);
        } else if (field.min !== undefined) {
          n = n.min(field.min, `Must be at least ${field.min}.`);
        } else if (field.max !== undefined) {
          n = n.max(field.max, `Must be at most ${field.max}.`);
        }
        const numberSchema = field.required ? n : n.optional();
        schema = z.preprocess(
          (val) => (val === '' || val === null ? undefined : val),
          numberSchema
        );
        break;
      }
      case 'date': {
        const s = z.string();
        schema = field.required ? s.min(1, 'This field is required') : s.optional();
        break;
      }
      case 'dropdown':
      case 'multiple_choice': {
        // Controller-managed fields (no RHF register()) start as `undefined`, not `''`,
        // until touched — z.string() rejects undefined at the base type check before
        // .min(1, ...) ever runs, surfacing Zod's raw "expected string" message instead
        // of ours. Preprocess undefined/null to '' so the intended message actually fires.
        const s = z.string().min(1, 'This field is required');
        schema = field.required
          ? z.preprocess((v) => (v === undefined || v === null ? '' : v), s)
          : z.string().optional();
        break;
      }
      case 'checkbox': {
        // Same issue as dropdown/multiple_choice, for the array base type.
        const s = z.array(z.string()).min(1, 'Please select at least one option.');
        schema = field.required
          ? z.preprocess((v) => (v === undefined || v === null ? [] : v), s)
          : z.array(z.string()).optional();
        break;
      }
      case 'file_upload': {
        // Value is the uploaded file's R2 key once the file finishes uploading.
        schema = field.required ? z.string().min(1, 'This field is required') : z.string().optional();
        break;
      }
    }

    shape[field.fieldId] = schema;
  }

  return z.object(shape);
}
