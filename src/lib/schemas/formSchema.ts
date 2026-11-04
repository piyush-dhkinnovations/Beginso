import { z } from 'zod';

/**
 * Zod schema for the Create Form modal.
 * Validates title and optional description before calling POST /api/forms.
 */
export const createFormSchema = z.object({
  // The same limits the server enforces (POST /api/forms): a title of 3 to 100 characters, a description of up to 500.
  title: z
    .string()
    .trim()
    .min(1, 'Form title is required')
    .min(3, 'Form title must be at least 3 characters')
    .max(100, 'Form title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export type CreateFormValues = z.infer<typeof createFormSchema>;
