import { z } from 'zod';
import { STAGE_COLOR_TOKENS } from '@/types/stage';

// Sprint 12 (inbox-collaboration), task 5.1. Same "client-side hint; server authoritative"
// precedent as tagSchema (lib/schemas/tag.ts) — case-insensitive name uniqueness isn't
// re-implemented here without the live stage list to check against.
export const stageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(30, 'Name must be 30 characters or fewer'),
  colour: z.enum(STAGE_COLOR_TOKENS),
  category: z.enum(['new', 'in_progress', 'completed']),
});

export type StageFormValues = z.infer<typeof stageSchema>;
