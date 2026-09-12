import { z } from 'zod';

/**
 * Zod schema for the Invite Members modal (requirements.md §7.4, design.md §14).
 * Accepts one or more comma-separated emails and a single role applied to all of them.
 * Owner is deliberately not an option — ownership only transfers, never gets invited into.
 *
 * `emails` stays a plain string here (not transformed into string[]) — a Zod transform would
 * change the form's *output* type without changing its *input* type, and react-hook-form's
 * useForm<T> only takes one type for both, which forces an awkward cast on defaultValues/reset.
 * The comma-split into an array happens once, at submit time, in the component itself.
 */
export const inviteMembersSchema = z.object({
  emails: z
    .string()
    .trim()
    .min(1, 'Enter at least one email address')
    .refine(
      (value) => {
        const emails = value.split(',').map((email) => email.trim()).filter(Boolean);
        return emails.length > 0 && emails.every((email) => z.string().email().safeParse(email).success);
      },
      { message: 'Enter valid email addresses, separated by commas' }
    ),
  role: z.enum(['admin', 'member', 'viewer'], { message: 'Select a role' }),
});

export type InviteMembersValues = z.infer<typeof inviteMembersSchema>;
