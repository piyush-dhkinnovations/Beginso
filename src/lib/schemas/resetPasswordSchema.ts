import { z } from 'zod';
import { passwordSchema } from './signupSchema';

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
