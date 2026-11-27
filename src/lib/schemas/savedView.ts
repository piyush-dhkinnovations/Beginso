import { z } from 'zod';

// "name 1-60; visibility personal|team (team only
// if permitted)." The permission gate on `team` (Editor+) is applied by the caller
// (SaveViewModal only offers the option when `canCreateTeamView` is true) — this schema just
// validates the shape once submitted.
export const savedViewSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be 60 characters or fewer'),
  visibility: z.enum(['personal', 'team']),
});

export type SavedViewFormValues = z.infer<typeof savedViewSchema>;
