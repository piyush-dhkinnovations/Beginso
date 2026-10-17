import { z } from 'zod';

/**
 * Zod schema for the Create Workspace modal.
 * Validates name (only field the create flow collects) before calling POST /api/workspaces.
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workspace name is required')
    .min(2, 'Workspace name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less'),
});

export type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;
