import { z } from 'zod';

// Sprint 12 (inbox-collaboration), design.md §11.2/§17: "body 1-5000 after trim; mentionIds only
// from the picker" — mentionIds isn't validated here beyond being a string array since it never
// comes from user-typed text, only MentionPicker's own selections.
export const noteSchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty').max(5000, 'Note must be 5000 characters or fewer'),
  mentionIds: z.array(z.string()).optional(),
});
