// sprint-10-events-migration design.md §13. Backend contract to confirm (BE 0.1–0.5) — no backend
// repo is reachable from this checkout. `action` is deliberately `string`, not a union: the
// backend owns the action-type list and a frontend-locked union would need lockstep updates.
export interface WorkspaceEventItem {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  createdAt: string;
  // Backend contract to confirm (BE 0.4): the Audit Log wireframe has an IP column but design.md
  // §11.2's contract has no IP field. Optional and shown as-is — the Sprint 11 security audit
  // requires "no raw IPs", so whatever the backend sends here should already be masked/hashed.
  ip?: string | null;
  // Sprint 14 (B5.3): free-form per action - e.g. `rows` (row count) and `format` on report.create /
  // report.download. Read defensively; never assume a key is present.
  metadata?: Record<string, unknown> | null;
}

export interface AuditFilters {
  actorId?: string;
  range?: '7d' | '30d' | 'all';
  page?: number;
  limit?: number;
}
