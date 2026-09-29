import { z } from 'zod';
import { STAGE_COLOR_TOKENS } from '@/types/stage';

// Sprint 12 (inbox-collaboration), design.md §14: "name 1-30, trimmed, case-insensitively
// unique." Case-insensitive uniqueness is server-authoritative (design.md §14's own "client-side
// hint; server authoritative" precedent on stageSchema) — not re-implemented here without the
// live tag list to check against.
export const tagSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(30, 'Name must be 30 characters or fewer'),
  colour: z.enum(STAGE_COLOR_TOKENS),
});

export type TagFormValues = z.infer<typeof tagSchema>;
