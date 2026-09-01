export type WorkspaceId = string;

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  /**
   * IANA timezone string (e.g. "Asia/Kolkata") — the workspace's display
   * default. Decided under P2: every timestamp is still stored in UTC;
   * this field only controls how it's rendered when no per-user override
   * exists (see Membership.timezoneOverride).
   */
  timezone: string;
  createdAt: string;
  updatedAt: string;
}
