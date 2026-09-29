/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.7, design.md §11.1/§11.2. Backend contract
 * to confirm — field names are a proposal. Colour reuses the same fixed token palette as `Stage`
 * (design.md §15/OQ-10: "a stored colour is a token name," never raw hex) rather than a second
 * parallel enum.
 */
import type { StageColorToken } from './stage';

export interface Tag {
  id: string;
  name: string;
  colour: StageColorToken;
  /** Uncertain until BE 0.2 ships (design.md §13) — present on the manager list ("usage count
   * before delete", requirements.md §7.7), not guaranteed on every embed. */
  usageCount?: number;
}

/** POST/PATCH /api/workspaces/:workspaceId/tags[/:tagId] body. */
export interface TagPayload {
  name: string;
  colour: StageColorToken;
}
