import { z } from 'zod';
import { passwordSchema } from './signupSchema'; // reused, not redefined — see design.md §13

export const profileNameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name must be 50 characters or fewer.'),
});

export const workspaceNameSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters.').max(100, 'Workspace name must be 100 characters or fewer.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match.',
  path: ['confirmNewPassword'],
});

export type ProfileNameFormValues = z.infer<typeof profileNameSchema>;
export type WorkspaceNameFormValues = z.infer<typeof workspaceNameSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
