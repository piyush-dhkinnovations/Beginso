import { z } from 'zod';

// Sprint 12 (inbox-collaboration), design.md §14: "name 1-60; visibility personal|team (team only
// if permitted)." The permission gate on `team` (Editor+, OQ-8 default) is applied by the caller
// (SaveViewModal only offers the option when `canCreateTeamView` is true) — this schema just
// validates the shape once submitted.
export const savedViewSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be 60 characters or fewer'),
  visibility: z.enum(['personal', 'team']),
});

export type SavedViewFormValues = z.infer<typeof savedViewSchema>;
