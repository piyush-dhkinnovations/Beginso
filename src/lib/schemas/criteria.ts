import { z } from 'zod';

// Sprint 12 (inbox-collaboration), task 5.2. Same "client-side hint; server authoritative"
// precedent as stageSchema/tagSchema (lib/schemas/{stage,tag}.ts) — case-insensitive uniqueness,
// if the backend enforces it, isn't re-implemented here without the live criteria list to check
// against.
export const criteriaSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(60, 'Label must be 60 characters or fewer'),
});

export type CriteriaFormValues = z.infer<typeof criteriaSchema>;
