/**
 * Colour reuses the same fixed token palette as `Stage`
 * ("a stored colour is a token name," never raw hex) rather than a second
 * parallel enum.
 */
import type { StageColorToken } from './stage';

export interface Tag {
  id: string;
  name: string;
  colour: StageColorToken;
  /** Present on the manager list ("usage count
   * before delete"), not guaranteed on every embed. */
  usageCount?: number;
}

/** POST/PATCH /api/workspaces/:workspaceId/tags[/:tagId] body. */
export interface TagPayload {
  name: string;
  colour: StageColorToken;
}
