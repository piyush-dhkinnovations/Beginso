import { z } from 'zod';

/**
 * Zod schema for FormAccessPanel (requirements.md §7.8, design.md §14).
 * Grants one email a single role, scoped to one form. Owner is not an option — same reasoning
 * as inviteMembersSchema (ownership only transfers, never gets granted through these flows).
 */
export const formAccessSchema = z.object({
  email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address'),
  role: z.enum(['admin', 'member', 'viewer'], { message: 'Select a role' }),
});

export type FormAccessValues = z.infer<typeof formAccessSchema>;
