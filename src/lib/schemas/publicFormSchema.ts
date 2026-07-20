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
        const s = z.string().email('Please enter a valid email address.');
        schema = field.required ? s.min(1, 'This field is required') : s.optional();
        break;
      }
      case 'phone': {
        const s = z.string().regex(/^[\d\s\-+]+$/, 'Please enter a valid phone number.');
        schema = field.required ? s.min(1, 'This field is required') : s.optional();
        break;
      }
      case 'number': {
        let n = z.coerce.number();
        if (field.min !== undefined && field.max !== undefined) {
          n = n
            .min(field.min, `Must be between ${field.min} and ${field.max}.`)
            .max(field.max, `Must be between ${field.min} and ${field.max}.`);
        } else if (field.min !== undefined) {
          n = n.min(field.min, `Must be at least ${field.min}.`);
        } else if (field.max !== undefined) {
          n = n.max(field.max, `Must be at most ${field.max}.`);
        }
        schema = field.required ? n : n.optional();
        break;
      }
      case 'date': {
        const s = z.string();
        schema = field.required ? s.min(1, 'This field is required') : s.optional();
        break;
      }
      case 'dropdown':
      case 'multiple_choice': {
        const s = z.string();
        schema = field.required ? s.min(1, 'This field is required') : s.optional();
        break;
      }
      case 'checkbox': {
        const s = z.array(z.string());
        schema = field.required ? s.min(1, 'Please select at least one option.') : s.optional();
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
