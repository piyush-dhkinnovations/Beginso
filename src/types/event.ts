// `action` is deliberately `string`, not a union: the
// backend owns the action-type list and a frontend-locked union would need lockstep updates.
export interface WorkspaceEventItem {
  id: string;
  actorName: string;
  /** The actor's user id (empty for an actor with no account), email, and profile picture as the backend sent them. */
  actorId?: string;
  actorEmail?: string;
  actorAvatarUrl?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  createdAt: string;
  // The backend sends this already hashed, never a raw address (the security rule is
  // "no raw IPs"). Optional and shown as-is.
  ip?: string | null;
  // Free-form per action - e.g. `rows` (row count) and `format` on report.create /
  // report.download. Read defensively; never assume a key is present.
  metadata?: Record<string, unknown> | null;
}

export interface AuditFilters {
  actorId?: string;
  range?: '7d' | '30d' | 'all';
  page?: number;
  limit?: number;
}
