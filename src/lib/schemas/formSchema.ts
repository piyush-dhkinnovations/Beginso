import { z } from 'zod';

/**
 * Zod schema for the Create Form modal.
 * Validates title and optional description before calling POST /api/forms.
 */
export const createFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Form title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
});

export type CreateFormValues = z.infer<typeof createFormSchema>;
